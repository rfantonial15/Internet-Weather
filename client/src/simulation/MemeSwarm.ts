import { Vector3, Color } from "three";
import { SimModule } from "./SimModule";
import type { WeatherEvent } from "@iw/shared";
import { geoToVec3 } from "@/utils/geo";
import { sphericalLerp, randomTangent } from "./curves";
import { palette } from "@/config/colors";

/**
 * Migrating particle swarms for meme events.
 *
 * Each event spawns a swarm of N particles. Every particle is given a slightly
 * jittered destination relative to the swarm's chosen target — this makes the
 * swarm look like a flock arriving rather than a single point translating.
 *
 * Animation: each particle slerps from origin → destination over its lifetime
 * with a per-particle phase offset (0.0..0.4) so leaders arrive first and
 * stragglers trail behind. The natural curvature of slerp on a sphere keeps
 * the whole swarm visibly arcing across continents.
 *
 * Color: all particles in a single swarm share a hue; different swarms pick
 * from a small palette so adjacent migrations don't blur into each other.
 */
const PARTICLES_PER_EVENT_MIN = 24;
const PARTICLES_PER_EVENT_MAX = 48;
const SWARM_TRAVEL_TIME_SEC = 6.0;
const SHELL_RADIUS = 1.014;

const SWARM_COLORS: Color[] = [
  new Color(palette.meme),
  new Color(palette.viral),
  new Color(palette.trend),
  new Color("#88a6ff"),
];

export class MemeSwarm extends SimModule {
  readonly name = "swarm";
  readonly kinds = ["meme"] as const;
  readonly capacity = 768;

  /** Current world-space position (computed every frame from slerp). */
  positions: Float32Array;
  origins: Float32Array;
  destinations: Float32Array;
  colors: Float32Array;
  birthTimes: Float32Array;
  lives: Float32Array;
  /** Per-particle phase offset in [0, 0.4) — leaders arrive first. */
  phaseOffsets: Float32Array;
  alive: Uint8Array;

  private freeList: number[] = [];
  private _origin = new Vector3();
  private _dest = new Vector3();
  private _tmp = new Vector3();
  private _slerp = new Vector3();

  constructor() {
    super();
    this.positions = new Float32Array(this.capacity * 3);
    this.origins = new Float32Array(this.capacity * 3);
    this.destinations = new Float32Array(this.capacity * 3);
    this.colors = new Float32Array(this.capacity * 3);
    this.birthTimes = new Float32Array(this.capacity);
    this.lives = new Float32Array(this.capacity);
    this.phaseOffsets = new Float32Array(this.capacity);
    this.alive = new Uint8Array(this.capacity);
    for (let i = this.capacity - 1; i >= 0; i--) this.freeList.push(i);
  }

  spawn(e: WeatherEvent) {
    if (!e.at) return;
    const origin = geoToVec3(e.at, 1, this._origin).normalize();

    // Choose a destination — a random tangent rotation away from origin.
    // Distance scales with intensity so big memes travel further.
    const tangent = randomTangent(origin, this._tmp);
    const distance = (0.4 + Math.random() * 0.8) * (0.7 + e.intensity * 0.6);
    const dest = this._dest
      .copy(origin)
      .multiplyScalar(Math.cos(distance))
      .addScaledVector(tangent, Math.sin(distance))
      .normalize();

    const swarmColor = SWARM_COLORS[Math.floor(Math.random() * SWARM_COLORS.length)];
    const burst =
      PARTICLES_PER_EVENT_MIN +
      Math.floor(Math.random() * (PARTICLES_PER_EVENT_MAX - PARTICLES_PER_EVENT_MIN));
    const tNow = performance.now() / 1000;

    for (let n = 0; n < burst; n++) {
      const i = this.freeList.pop();
      if (i === undefined) break;

      // Per-particle origin: jittered around the event's origin.
      const jitter = randomTangent(origin, this._tmp).multiplyScalar(Math.random() * 0.04);
      const ox = origin.x + jitter.x;
      const oy = origin.y + jitter.y;
      const oz = origin.z + jitter.z;
      const oLen = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;

      // Per-particle destination: jittered around the swarm's destination.
      const dJ = randomTangent(dest, this._tmp).multiplyScalar(Math.random() * 0.06);
      const dx = dest.x + dJ.x;
      const dy = dest.y + dJ.y;
      const dz = dest.z + dJ.z;
      const dLen = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

      const o = i * 3;
      this.origins[o + 0] = ox / oLen;
      this.origins[o + 1] = oy / oLen;
      this.origins[o + 2] = oz / oLen;
      this.destinations[o + 0] = dx / dLen;
      this.destinations[o + 1] = dy / dLen;
      this.destinations[o + 2] = dz / dLen;

      this.positions[o + 0] = (ox / oLen) * SHELL_RADIUS;
      this.positions[o + 1] = (oy / oLen) * SHELL_RADIUS;
      this.positions[o + 2] = (oz / oLen) * SHELL_RADIUS;

      this.colors[o + 0] = swarmColor.r;
      this.colors[o + 1] = swarmColor.g;
      this.colors[o + 2] = swarmColor.b;

      this.birthTimes[i] = tNow;
      this.lives[i] = SWARM_TRAVEL_TIME_SEC * (0.85 + Math.random() * 0.3);
      this.phaseOffsets[i] = Math.random() * 0.4;
      this.alive[i] = 1;
    }

    this.energyValue = Math.min(1, this.energyValue + e.intensity * 0.25);
    this.dirty = true;
  }

  update(dt: number, t: number) {
    let active = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.alive[i]) continue;
      const age = (t - this.birthTimes[i]) / this.lives[i];
      if (age >= 1) {
        this.alive[i] = 0;
        this.freeList.push(i);
        continue;
      }

      // Apply per-particle phase: leaders ahead, stragglers behind.
      // Clamp progress so phase never pushes past 1.
      const progress = Math.max(0, Math.min(1, age + this.phaseOffsets[i]));
      // Ease-in-out: gentle takeoff, gentle landing.
      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const o = i * 3;
      this._origin.set(this.origins[o + 0], this.origins[o + 1], this.origins[o + 2]);
      this._dest.set(this.destinations[o + 0], this.destinations[o + 1], this.destinations[o + 2]);
      sphericalLerp(this._origin, this._dest, eased, this._slerp).normalize();

      this.positions[o + 0] = this._slerp.x * SHELL_RADIUS;
      this.positions[o + 1] = this._slerp.y * SHELL_RADIUS;
      this.positions[o + 2] = this._slerp.z * SHELL_RADIUS;
      active++;
    }
    this.count = active;
    this.energyValue = Math.max(0, this.energyValue - dt * 0.1);
    this.dirty = true;
  }
}
