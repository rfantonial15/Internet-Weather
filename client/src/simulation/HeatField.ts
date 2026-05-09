import { Vector3 } from "three";
import { SimModule } from "./SimModule";
import type { WeatherEvent } from "@iw/shared";
import { geoToVec3 } from "@/utils/geo";

/**
 * Expanding heat zones for viral / trend events.
 *
 * Each zone is a single point on the sphere with a birth time and a peak
 * intensity. The renderer draws each zone as a glowing disc oriented along
 * the surface normal; the disc's radius grows over the zone's lifetime
 * (ease-out from 0 → maxRadius), and its alpha fades at end-of-life.
 *
 * Multiple overlapping zones additively combine in the renderer — when a
 * topic goes truly viral and a dozen events land in the same region within
 * a few seconds, you see a single spreading firestorm rather than discrete
 * pings.
 *
 * Why not particles? Heat is a *field*, not a swarm. A single instanced
 * disc per zone gives the right "molten lava spreading" read at <50 active
 * zones cost.
 */
const ZONE_LIFE_SEC = 9.5;
const MAX_RADIUS = 0.45;

export class HeatField extends SimModule {
  readonly name = "heat";
  readonly kinds = ["viral", "trend"] as const;
  readonly capacity = 64;

  /** Zone position on unit sphere (will be scaled to radius 1.003 by renderer). */
  positions: Float32Array;
  /** Surface normals (== position normalized; cached for the renderer). */
  normals: Float32Array;
  birthTimes: Float32Array;
  lives: Float32Array;
  intensities: Float32Array;
  /** Hue shift 0..1: 0 = orange (trend), 1 = red-magenta (peak viral). */
  hue: Float32Array;
  alive: Uint8Array;

  private freeList: number[] = [];
  private _v = new Vector3();

  constructor() {
    super();
    this.positions = new Float32Array(this.capacity * 3);
    this.normals = new Float32Array(this.capacity * 3);
    this.birthTimes = new Float32Array(this.capacity);
    this.lives = new Float32Array(this.capacity);
    this.intensities = new Float32Array(this.capacity);
    this.hue = new Float32Array(this.capacity);
    this.alive = new Uint8Array(this.capacity);
    for (let i = this.capacity - 1; i >= 0; i--) this.freeList.push(i);
  }

  spawn(e: WeatherEvent) {
    if (!e.at) return;
    const i = this.freeList.pop();
    if (i === undefined) return;

    const p = geoToVec3(e.at, 1, this._v).normalize();
    const o = i * 3;
    this.positions[o + 0] = p.x;
    this.positions[o + 1] = p.y;
    this.positions[o + 2] = p.z;
    this.normals[o + 0] = p.x;
    this.normals[o + 1] = p.y;
    this.normals[o + 2] = p.z;

    this.birthTimes[i] = performance.now() / 1000;
    this.lives[i] = ZONE_LIFE_SEC * (0.6 + e.intensity * 0.9);
    this.intensities[i] = e.intensity;
    this.hue[i] = e.kind === "viral" ? 0.7 + Math.random() * 0.3 : 0.1 + Math.random() * 0.3;
    this.alive[i] = 1;

    this.energyValue = Math.min(1, this.energyValue + e.intensity * 0.35);
    this.dirty = true;
  }

  update(dt: number, t: number) {
    let active = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.alive[i]) continue;
      const age = t - this.birthTimes[i];
      if (age >= this.lives[i]) {
        this.alive[i] = 0;
        this.freeList.push(i);
        continue;
      }
      active++;
    }
    this.count = active;
    this.energyValue = Math.max(0, this.energyValue - dt * 0.12);
    this.dirty = true;
  }

  /** Eased radius for a given zone — what the renderer uses to scale the disc. */
  radius(i: number, t: number): number {
    const age = (t - this.birthTimes[i]) / this.lives[i];
    if (age < 0 || age > 1) return 0;
    // Ease-out cubic: fast spread, slow settle.
    const eased = 1 - Math.pow(1 - age, 3);
    return eased * MAX_RADIUS * (0.5 + this.intensities[i] * 1.0);
  }

  /** Eased alpha for a given zone — bell curve over lifetime. */
  alpha(i: number, t: number): number {
    const age = (t - this.birthTimes[i]) / this.lives[i];
    if (age < 0 || age > 1) return 0;
    // Quick rise, sustain, slow tail.
    if (age < 0.15) return age / 0.15;
    return Math.max(0, 1 - (age - 0.15) / 0.85);
  }
}
