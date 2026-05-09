import { Vector3 } from "three";
import { SimModule } from "./SimModule";
import type { WeatherEvent } from "@iw/shared";
import { geoToVec3 } from "@/utils/geo";
import { arcPoints, randomTangent } from "./curves";

/**
 * Lightning arcs for controversy events.
 *
 * Two-mode spawn:
 *   1. If a recent controversy point is held in `recentPoints`, the new event
 *      strikes between them — long arcs across continents, the visual
 *      signature of factional split.
 *   2. Otherwise, the event forks to a nearby random point — short, jagged
 *      sparks at the source.
 *
 * Each arc is sampled as `SEGMENTS` points along a great-circle great arc,
 * lifted off the surface so the curve arches above the planet. Renderers
 * read `positions` directly as a `Line` index buffer (LineSegments) — every
 * adjacent pair forms a segment, so the renderer never sees a gap between
 * two different arcs.
 */
const SEGMENTS = 16;
const RECENT_POOL = 8;
const ARC_LIFE_SEC = 0.85;
const PEER_PROBABILITY = 0.65;

export class LightningArcs extends SimModule {
  readonly name = "lightning";
  readonly kinds = ["controversy"] as const;
  readonly capacity = 64;

  /** capacity * SEGMENTS * 3 — sample positions for every arc. */
  positions: Float32Array;
  /** capacity scalars — birth time per arc. */
  birthTimes: Float32Array;
  lives: Float32Array;
  intensities: Float32Array;
  alive: Uint8Array;

  /** capacity * 2 * (SEGMENTS - 1) indices for LineSegments draw. */
  indices: Uint16Array;

  private freeList: number[] = [];
  private recentPoints: Vector3[] = [];

  // scratch
  private _a = new Vector3();
  private _b = new Vector3();
  private _t = new Vector3();

  readonly segments = SEGMENTS;

  constructor() {
    super();
    this.positions = new Float32Array(this.capacity * SEGMENTS * 3);
    this.birthTimes = new Float32Array(this.capacity);
    this.lives = new Float32Array(this.capacity);
    this.intensities = new Float32Array(this.capacity);
    this.alive = new Uint8Array(this.capacity);

    // Pre-compute the index buffer for LineSegments. Every adjacent pair
    // within an arc forms one segment; arcs are disjoint by construction.
    this.indices = new Uint16Array(this.capacity * 2 * (SEGMENTS - 1));
    for (let arc = 0; arc < this.capacity; arc++) {
      for (let s = 0; s < SEGMENTS - 1; s++) {
        const idx = (arc * (SEGMENTS - 1) + s) * 2;
        this.indices[idx + 0] = arc * SEGMENTS + s;
        this.indices[idx + 1] = arc * SEGMENTS + s + 1;
      }
    }

    for (let i = this.capacity - 1; i >= 0; i--) this.freeList.push(i);
  }

  spawn(e: WeatherEvent) {
    if (!e.at) return;
    const a = geoToVec3(e.at, 1, this._a).normalize();

    // Choose endpoint: recent peer with probability, else nearby random tangent.
    let b: Vector3;
    if (this.recentPoints.length > 0 && Math.random() < PEER_PROBABILITY) {
      const peer =
        this.recentPoints[Math.floor(Math.random() * this.recentPoints.length)];
      b = this._b.copy(peer);
    } else {
      // Fork: short arc along a random tangent.
      const t = randomTangent(a, this._t);
      const distance = 0.15 + Math.random() * 0.4; // radians along the great circle
      b = this._b.copy(a).multiplyScalar(Math.cos(distance))
        .addScaledVector(t, Math.sin(distance));
    }

    const i = this.freeList.pop();
    if (i === undefined) {
      this.rememberPoint(a);
      return;
    }

    // Sample arc points; lift the midpoint by a small altitude to arch.
    const lift = 0.04 + Math.random() * 0.06;
    arcPoints(a, b, SEGMENTS, lift, this.positions, i * SEGMENTS);

    this.birthTimes[i] = performance.now() / 1000;
    this.lives[i] = ARC_LIFE_SEC * (0.7 + e.intensity * 0.6);
    this.intensities[i] = e.intensity;
    this.alive[i] = 1;

    this.energyValue = Math.min(1, this.energyValue + e.intensity * 0.4);
    this.dirty = true;
    this.rememberPoint(a);
  }

  /** Remember `a` as a possible peer for future arcs. */
  private rememberPoint(a: Vector3) {
    this.recentPoints.push(a.clone());
    if (this.recentPoints.length > RECENT_POOL) this.recentPoints.shift();
  }

  update(_dt: number, t: number) {
    let active = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.alive[i]) continue;
      const age = t - this.birthTimes[i];
      if (age >= this.lives[i]) {
        this.alive[i] = 0;
        this.freeList.push(i);
        // Zero out so the renderer doesn't draw stale positions; we leave
        // the index buffer as-is and just collapse the line segment to a point.
        const o = i * SEGMENTS * 3;
        for (let s = 0; s < SEGMENTS * 3; s++) this.positions[o + s] = 0;
        continue;
      }
      active++;
    }
    this.count = active;
    this.energyValue = Math.max(0, this.energyValue - _dt * 0.4);
    this.dirty = true;
  }

  /** Brightness-per-arc, used by the renderer's vertex coloring. */
  brightness(i: number, t: number): number {
    const age = t - this.birthTimes[i];
    const tNorm = age / this.lives[i];
    if (tNorm < 0.08) return tNorm / 0.08;       // fast strike
    return Math.max(0, 1 - (tNorm - 0.08) / 0.92); // slow fade
  }
}
