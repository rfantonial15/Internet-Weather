import { NarrationEngine } from "@iw/shared/narration/NarrationEngine";
import { TemplateNarrator } from "@iw/shared/narration/TemplateNarrator";
import { useEventStore } from "@/state/useEventStore";
import { useNarrationStore } from "@/state/useNarrationStore";
import { weather } from "@/simulation/WeatherSystem";

/**
 * In-browser narrator for when there is no server: the same engine and
 * template narrator the server runs (shared/narration), fed by the local
 * event stream. Stopped as soon as server events arrive.
 */
const FIRST_LINE_MS = 5000;

let engine: NarrationEngine | null = null;
let unsubscribe: (() => void) | null = null;
let firstLine = 0;

export function startLocalNarration() {
  if (engine) return;
  const e = new NarrationEngine(new TemplateNarrator());
  e.onNarration = (n) => useNarrationStore.getState().push(n);

  let lastId = useEventStore.getState().lastId;
  unsubscribe = useEventStore.subscribe((s) => {
    if (s.lastId === lastId) return;
    lastId = s.lastId;
    const ev = s.events[s.events.length - 1];
    if (!ev) return;
    e.observe(ev);
    e.tension = weather.tension();
  });

  e.start();
  // The engine ticks every 8 s; say something soon after the boot veil lifts.
  firstLine = window.setTimeout(() => void e.tick(), FIRST_LINE_MS);
  engine = e;
}

export function stopLocalNarration() {
  if (!engine) return;
  window.clearTimeout(firstLine);
  unsubscribe?.();
  unsubscribe = null;
  engine.stop();
  engine = null;
}
