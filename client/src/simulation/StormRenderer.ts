import { Vector3, Color } from "three";
import { SimModule } from "./SimModule";
import type { WeatherEvent } from "@iw/shared";
import { geoToVec3 } from "@/utils/geo";
import { palette } from "@/config/colors";
import { randomTangent } from "./curves";

/**
 * Localized storm cells for rage / controversy events.
 *
 * Each event puffs out a cluster of particles at its surface point with
 * random tangent velocities. Particles drift along the sphere shell, swirl
 * via a slight cross-product impulse (cheap fake curl), and recycle through
 * a free list when their lifetime expires.
 *
 * Shape:
 *   particles[] is a typed-array pool of length `capacity`.
 *   `freeList` holds indices currently available for spawn.
 *   `count` is what the renderer should draw — recomputed every update().
 *
 * The shell is at 1.012 (just above the cloud layer) so storm particles
 * read as weather hovering above the planet, not skidding on the surface.
 */
const PARTICLES_PER_EVENT_MIN = 14;
const PARTICLES_PER_EVENT_MAX = 28;
const BASE_LIFE_SEC = 8.0;
const SHELL_RADIUS = 1.012;

export class StormRenderer extends SimModule {
  readonly name = "storms";
  readonly kinds = ["rage", "controversy"] as const;
  readonly capacity = 1024;

  positions: Float32Array;
  colors: Float32Array;
  velocities: Float32Array;
  birthTimes: Float32Array;
  lives: Float32Array;
  alive: Uint8Array;

  private freeList: number[] = [];

  // Scratch — reused; never allocated in hot paths.
  private _center = new Vector3();
  private _tangent = new Vector3();
  private _rage = new Color(palette.rage);
  private _controversy = new Color(palette.controversy);

  constructor() {
    super();
    this.positions = new Float32Array(this.capacity * 3);
    this.colors = new Float32Array(this.capacity * 3);
    this.velocities = new Float32Array(this.capacity * 3);
    this.birthTimes = new Float32Array(this.capacity);
    this.lives = new Float32Array(this.capacity);
    this.alive = new Uint8Array(this.capacity);
    for (let i = this.capacity - 1; i >= 0; i--) this.freeList.push(i);
  }

  spawn(e: WeatherEvent) {
    if (!e.at) return;
    const center = geoToVec3(e.at, 1, this._center).normalize();
    const isRage = e.kind === "rage";
    const col = isRage ? this._rage : this._controversy;
    const burst =
      PARTICLES_PER_EVENT_MIN +
      Math.floor(Math.random() * (PARTICLES_PER_EVENT_MAX - PARTICLES_PER_EVENT_MIN));

    const tNow = performance.now() / 1000;
    for (let n = 0; n < burst; n++) {
      const i = this.freeList.pop();
      if (i === undefined) break;

      const tangent = randomTangent(center, this._tangent);
      const speed = (0.04 + Math.random() * 0.09) * (0.55 + e.intensity * 0.9);

      // Initial position: small radial offset along tangent, projected to shell.
      const off = Math.random() * 0.025;
      const px = center.x * SHELL_RADIUS + tangent.x * off;
      const py = center.y * SHELL_RADIUS + tangent.y * off;
      const pz = center.z * SHELL_RADIUS + tangent.z * off;
      const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
      const k = SHELL_RADIUS / len;

      const o = i * 3;
      this.positions[o + 0] = px * k;
      this.positions[o + 1] = py * k;
      this.positions[o + 2] = pz * k;
      this.velocities[o + 0] = tangent.x * speed;
      this.velocities[o + 1] = tangent.y * speed;
      this.velocities[o + 2] = tangent.z * speed;
      this.colors[o + 0] = col.r;
      this.colors[o + 1] = col.g;
      this.colors[o + 2] = col.b;

      this.birthTimes[i] = tNow;
      this.lives[i] = BASE_LIFE_SEC * (0.6 + e.intensity * 0.9);
      this.alive[i] = 1;
    }

    this.energyValue = Math.min(1, this.energyValue + e.intensity * 0.3);
    this.dirty = true;
  }

  update(dt: number, t: number) {
    let active = 0;
    const decay = Math.exp(-0.4 * dt);

    for (let i = 0; i < this.capacity; i++) {
      if (!this.alive[i]) continue;
      const age = t - this.birthTimes[i];
      if (age >= this.lives[i]) {
        this.alive[i] = 0;
        this.freeList.push(i);
        continue;
      }
      const o = i * 3;

      // Integrate.
      let nx = this.positions[o + 0] + this.velocities[o + 0] * dt;
      let ny = this.positions[o + 1] + this.velocities[o + 1] * dt;
      let nz = this.positions[o + 2] + this.velocities[o + 2] * dt;

      // Re-project onto the shell — particles "stick" to the atmosphere.
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      const k = SHELL_RADIUS / len;
      nx *= k;
      ny *= k;
      nz *= k;

      // Slight curl: rotate velocity by small angle around the local normal.
      // The normal is the position vector (since we're on a unit-ish sphere).
      // Rodrigues with a tiny angle ≈ cross product addition.
      const swirl = 0.6 * dt;
      const cx = ny * this.velocities[o + 2] - nz * this.velocities[o + 1];
      const cy = nz * this.velocities[o + 0] - nx * this.velocities[o + 2];
      const cz = nx * this.velocities[o + 1] - ny * this.velocities[o + 0];

      this.positions[o + 0] = nx;
      this.positions[o + 1] = ny;
      this.positions[o + 2] = nz;
      this.velocities[o + 0] = (this.velocities[o + 0] + cx * swirl) * decay;
      this.velocities[o + 1] = (this.velocities[o + 1] + cy * swirl) * decay;
      this.velocities[o + 2] = (this.velocities[o + 2] + cz * swirl) * decay;

      active++;
    }
    this.count = active;
    this.energyValue = Math.max(0, this.energyValue - dt * 0.18);
    this.dirty = true;
  }
}
