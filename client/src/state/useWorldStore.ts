import { create } from "zustand";

/**
 * World state that React UI cares about. Per-frame values (time, sun
 * direction, shader tension) live in `core/frameUniforms` instead, so the
 * render loop never churns React state.
 */
interface WorldState {
  /** 0..1 global tension, published at ~5 Hz for HUD readouts. */
  tension: number;
  setTension(t: number): void;
}

export const useWorldStore = create<WorldState>((set) => ({
  tension: 0,
  setTension: (t) => set({ tension: t }),
}));
