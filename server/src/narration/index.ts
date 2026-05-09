import type { Narration, WeatherEvent } from "@iw/shared";
import { NarrationEngine } from "./NarrationEngine.js";
import { TemplateNarrator } from "./TemplateNarrator.js";
import { ClaudeNarrator } from "./ClaudeNarrator.js";

/**
 * Top-level wiring for the narration system.
 *
 * Picks the narrator based on environment:
 *   - ANTHROPIC_API_KEY set → ClaudeNarrator (richer phrasing, costs API calls)
 *   - otherwise            → TemplateNarrator (offline default)
 *
 * Returns the engine + an `observe` shim that callers feed events into.
 * The host is responsible for setting `engine.tension` from whatever signal
 * it considers global stress (e.g., aggregated rage/controversy rate).
 */
export function createNarrationSystem(): {
  engine: NarrationEngine;
  observe: (e: WeatherEvent) => void;
  onNarration: (cb: (n: Narration) => void) => void;
} {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const narrator = apiKey ? new ClaudeNarrator(apiKey) : new TemplateNarrator();

  const engine = new NarrationEngine(narrator);
  engine.start();

  console.log(
    `[narration] engine started with narrator: ${narrator.name}` +
      (apiKey ? "" : " (set ANTHROPIC_API_KEY to use Claude)"),
  );

  return {
    engine,
    observe: (e) => engine.observe(e),
    onNarration: (cb) => {
      engine.onNarration = cb;
    },
  };
}

export { NarrationEngine } from "./NarrationEngine.js";
export { TemplateNarrator } from "./TemplateNarrator.js";
export { ClaudeNarrator } from "./ClaudeNarrator.js";
export type { Phenomenon, NarrationContext } from "./types.js";
