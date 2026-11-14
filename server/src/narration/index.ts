import type { Narration, WeatherEvent } from "@iw/shared";
import { NarrationEngine } from "../../../shared/narration/NarrationEngine.js";
import { TemplateNarrator } from "../../../shared/narration/TemplateNarrator.js";
import { ClaudeNarrator } from "./ClaudeNarrator.js";

/**
 * Server wiring for the narration system. The engine, classifier and
 * template narrator live in shared/narration so the browser can run the
 * same narrator when it has no server.
 *
 *   - ANTHROPIC_API_KEY set and @anthropic-ai/sdk installed: ClaudeNarrator
 *   - otherwise: TemplateNarrator (offline default)
 *
 * If the key is set but the SDK is missing, the engine starts on templates
 * and says so, instead of failing every tick.
 */
export function createNarrationSystem(): {
  engine: NarrationEngine;
  observe: (e: WeatherEvent) => void;
  onNarration: (cb: (n: Narration) => void) => void;
  stop: () => void;
} {
  const engine = new NarrationEngine(new TemplateNarrator());
  engine.start();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const claude = new ClaudeNarrator(apiKey);
    void claude.ready().then((ok) => {
      if (ok) {
        engine.setNarrator(claude);
        console.log("[narration] using Claude narrator");
      } else {
        console.warn("[narration] ANTHROPIC_API_KEY is set but @anthropic-ai/sdk is not installed; using templates");
      }
    });
  } else {
    console.log("[narration] using template narrator (set ANTHROPIC_API_KEY to use Claude)");
  }

  return {
    engine,
    observe: (e) => engine.observe(e),
    onNarration: (cb) => {
      engine.onNarration = cb;
    },
    stop: () => engine.stop(),
  };
}
