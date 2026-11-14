import { makeSimEvent, simBurstSize } from "@iw/shared/simulation";
import { ingest } from "./eventMapper";

/**
 * Local simulated feed: the fallback whenever the server is unreachable,
 * and the seed during the first moments of boot. Uses the same generator
 * as the server's default source, so offline and online look alike.
 */
const TICK_MS = 700;

let timer: number | null = null;
let seq = 0;

function emitBurst(n: number) {
  for (let i = 0; i < n; i++) ingest(makeSimEvent(seq++));
}

export function startSimulatedFeed() {
  if (timer != null) return;
  emitBurst(6);
  timer = window.setInterval(() => emitBurst(simBurstSize()), TICK_MS);
}

export function stopSimulatedFeed() {
  if (timer != null) {
    window.clearInterval(timer);
    timer = null;
  }
}

export function simulatedFeedRunning(): boolean {
  return timer != null;
}
