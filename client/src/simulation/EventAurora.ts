import { Vector3 } from "three";
import { SimModule } from "./SimModule";
import type { WeatherEvent } from "@iw/shared";
import { geoToVec3 } from "@/utils/geo";

/**
 * Local aurora pillars for wholesome events.
 *
 * Distinct from the global polar AuroraField — these are short-lived
 * vertical ribbons of soft blue/teal light at the event's surface point.
 * Each pillar swells smoothly over its lifetime then fades to nothing,
 * giving wholesome events a calm, breath-like presence (the visual
 * counterweight to rage's violent puff of particles).
 */
const PILLAR_LIFE_SEC = 7.5;
const PILLAR_HEIGHT_MAX = 0.45;
const PILLAR_BASE_RADIUS = 0.022;

export class EventAurora extends SimModule {
  readonly name = "auroraLocal";
  readonly kinds = ["wholesome"] as const;
  readonly capacity = 48;

  /** Anchor on unit sphere — used as cylinder base + axis. */
  positions: Float32Array;
  /** Surface normal (== position normalized) → cylinder up direction. */
  normals: Float32Array;
  birthTimes: Float32Array;
  lives: Float32Array;
  intensities: Float32Array;
  alive: Uint8Array;

  private freeList: number[] = [];
  private _v = new Vector3();

  readonly heightMax = PILLAR_HEIGHT_MAX;
  readonly baseRadius = PILLAR_BASE_RADIUS;

  constructor() {
    super();
    this.positions = new Float32Array(this.capacity * 3);
    this.normals = new Float32Array(this.capacity * 3);
    this.birthTimes = new Float32Array(this.capacity);
    this.lives = new Float32Array(this.capacity);
    this.intensities = new Float32Array(this.capacity);
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
    this.lives[i] = PILLAR_LIFE_SEC * (0.7 + e.intensity * 0.6);
    this.intensities[i] = e.intensity;
    this.alive[i] = 1;

    this.energyValue = Math.min(1, this.energyValue + e.intensity * 0.2);
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
    this.energyValue = Math.max(0, this.energyValue - dt * 0.06);
    this.dirty = true;
  }

  /** Bell-shaped swell over lifetime — slow rise, slow fall. */
  swell(i: number, t: number): number {
    const age = (t - this.birthTimes[i]) / this.lives[i];
    if (age < 0 || age > 1) return 0;
    // sin(πx) gives a smooth 0 → 1 → 0 curve over lifetime.
    return Math.sin(age * Math.PI);
  }
}
