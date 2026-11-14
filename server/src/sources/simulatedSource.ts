import type { EventSource } from "./source.js";
import { makeSimEvent, simBurstSize } from "../../../shared/simulation.js";

const TICK_MS = 750;

let timer: ReturnType<typeof setInterval> | null = null;
let seq = 0;

/**
 * Default backing source: keeps the planet alive without external APIs.
 * Uses the same generator as the browser fallback (shared/simulation.ts),
 * so signals cluster around real population centres.
 */
export const simulatedSource: EventSource = {
  key: "sim",
  start(emit) {
    if (timer) return;
    const tick = () => {
      const n = simBurstSize();
      for (let i = 0; i < n; i++) emit(makeSimEvent(seq++));
    };
    tick();
    timer = setInterval(tick, TICK_MS);
  },
  stop() {
    if (timer) clearInterval(timer);
    timer = null;
  },
};
