import type { EventKind, WeatherEvent } from "@iw/shared";

/**
 * Base class for a simulation module.
 *
 * Each module owns the state for one visual phenomenon (storms, arcs, heat
 * zones, swarms, auroras) and exposes typed arrays that its companion
 * renderer consumes each frame. Modules are pure TypeScript — no React, no
 * R3F. This keeps them testable, replaceable, and re-usable in Web Workers
 * if we ever offload simulation off the main thread.
 *
 * Lifecycle:
 *   ctor   → allocate fixed-size pools (no per-frame allocation)
 *   spawn  → invoked by WeatherSystem when an event of a matching kind arrives
 *   update → tick the simulation forward by `dt` seconds
 *   energy → 0..1 smoothed activity reading; drives global tension/HUD meters
 *
 * Pools use an explicit `freeList` rather than slot-shuffling so insertion
 * stays O(1) and the renderer can rely on stable instance indices.
 */
export abstract class SimModule {
  abstract readonly name: string;
  abstract readonly kinds: ReadonlyArray<EventKind>;
  abstract readonly capacity: number;

  /** Active slot count — drives the renderer's draw count. */
  count = 0;

  /** Renderers flip this to true when GPU buffers need re-upload. */
  dirty = false;

  protected energyValue = 0;

  abstract spawn(e: WeatherEvent): void;
  abstract update(dt: number, t: number): void;

  energy(): number {
    return this.energyValue;
  }
}
