import type { EventKind, WeatherEvent } from "@iw/shared";
import type { SimModule } from "./SimModule";
import { StormRenderer } from "./StormRenderer";
import { LightningArcs } from "./LightningArcs";
import { HeatField } from "./HeatField";
import { MemeSwarm } from "./MemeSwarm";
import { EventAurora } from "./EventAurora";

/**
 * Coordinator over a set of simulation modules. Owns the lifecycle:
 *   - routing inbound events to the modules that registered for the kind
 *   - ticking modules forward each frame
 *   - aggregating per-module energy into a single global "tension" reading
 *
 * Modules are registered once at construction. They never reach across to
 * each other — all inter-system coupling flows through aggregate readings
 * (tension/energy) and never through direct method calls. This is what
 * makes new phenomena drop-in: write a SimModule subclass, push it into
 * the constructor list, write the renderer.
 */
export class WeatherSystem {
  readonly modules: ReadonlyArray<SimModule>;
  readonly storms: StormRenderer;
  readonly lightning: LightningArcs;
  readonly heat: HeatField;
  readonly swarm: MemeSwarm;
  readonly auroraLocal: EventAurora;

  /** Routing table: kind → modules that handle it. Built once at ctor. */
  private routing: Map<EventKind, SimModule[]> = new Map();

  /** Smoothed tension 0..1 over the last tick. */
  private smoothedTension = 0;

  constructor() {
    this.storms = new StormRenderer();
    this.lightning = new LightningArcs();
    this.heat = new HeatField();
    this.swarm = new MemeSwarm();
    this.auroraLocal = new EventAurora();

    this.modules = [this.storms, this.lightning, this.heat, this.swarm, this.auroraLocal];

    for (const m of this.modules) {
      for (const k of m.kinds) {
        const list = this.routing.get(k) ?? [];
        list.push(m);
        this.routing.set(k, list);
      }
    }
  }

  /** Route an event to all interested modules. Safe to call at any time. */
  spawn(e: WeatherEvent) {
    const list = this.routing.get(e.kind);
    if (!list) return;
    for (const m of list) m.spawn(e);
  }

  /** Tick all modules. dt = seconds since last update. t = wall-clock seconds. */
  update(dt: number, t: number) {
    let total = 0;
    let weight = 0;
    for (const m of this.modules) {
      m.update(dt, t);
      // Storms/lightning weigh more in the global tension reading because
      // they're the "loudest" phenomena — let them dominate when active.
      const w = m === this.storms || m === this.lightning ? 1.5 : 1;
      total += m.energy() * w;
      weight += w;
    }
    const target = total / weight;
    // Critically-damped smoothing so HUD readings glide rather than snap.
    this.smoothedTension = this.smoothedTension + (target - this.smoothedTension) * Math.min(1, dt * 3);
  }

  tension(): number {
    return this.smoothedTension;
  }
}

/**
 * Singleton instance. Importing this everywhere is fine — there is only
 * one weather simulation per running tab. If we ever need multiple (e.g.
 * a "preview" instance for skill creators), wrap this in a React context.
 */
export const weather = new WeatherSystem();
