import { create } from "zustand";

interface WorldState {
  /** Seconds since boot. Driven by RenderPipeline; read-only for systems. */
  elapsed: number;
  /** Sun yaw (radians). Drives day/night terminator across the globe. */
  sunYaw: number;
  /** 0..1 global "tension" — derived from event mix, used by atmosphere shader. */
  tension: number;
  setElapsed(t: number): void;
  setSunYaw(y: number): void;
  setTension(t: number): void;
}

export const useWorldStore = create<WorldState>((set) => ({
  elapsed: 0,
  sunYaw: 0.6,
  tension: 0.2,
  setElapsed: (t) => set({ elapsed: t }),
  setSunYaw: (y) => set({ sunYaw: y }),
  setTension: (t) => set({ tension: t }),
}));
