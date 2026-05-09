import type { NarrationTone } from "@iw/shared";
import type { Phenomenon, NarrationContext } from "./types.js";

/**
 * The narrator interface. Two known implementations:
 *
 *   TemplateNarrator → deterministic, offline, ships by default
 *   ClaudeNarrator   → Claude API; richer phrasing, requires API key
 *
 * Both consume the same input (Phenomenon + tone + context) and return a
 * single sentence. Anything that varies (length cap, voice rules, fallback
 * behavior) is the implementer's problem; the engine doesn't care.
 *
 * The interface is async even though TemplateNarrator is synchronous, so
 * we can hot-swap implementations without changing the engine.
 */
export interface Narrator {
  readonly name: string;
  narrate(p: Phenomenon, tone: NarrationTone, ctx: NarrationContext): Promise<string>;
}
