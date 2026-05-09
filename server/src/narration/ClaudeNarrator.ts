import type { NarrationTone } from "@iw/shared";
import type { Narrator } from "./Narrator.js";
import type { Phenomenon, NarrationContext } from "./types.js";

/**
 * Claude-API-backed narrator.
 *
 * Optional implementation. Activated when ANTHROPIC_API_KEY is set in the
 * environment AND the @anthropic-ai/sdk package is installed. The dynamic
 * import keeps the dep optional — the server runs fine without either.
 *
 * Voice rules are enforced in the system prompt, not in post-processing,
 * because the model needs to know the *style constraints* up front. We also
 * pass tone explicitly so the model doesn't have to infer it from numbers.
 *
 * Anti-repetition is delegated to the engine's recent-text buffer, which
 * we feed in as `forbid` strings — strong instructions, low temperature.
 *
 * Cost: one short message per narration tick (default every 8s).
 *
 * To enable:
 *   cd server && npm i @anthropic-ai/sdk
 *   export ANTHROPIC_API_KEY=sk-...
 */

const SYSTEM_PROMPT = `You are the narrator of "Internet Weather", a cinematic visualization that treats human civilization as a planet with weather. You speak like a hybrid of David Attenborough, a NOAA forecaster, and a quietly awed civilization observer.

Voice rules:
- Output exactly one sentence. Under 18 words. No exclamation marks.
- Never address the user. Never refer to yourself.
- Present tense or recent past. No future speculation.
- No corporate or platform names. No idioms that don't read aloud well.
- Match the requested tone exactly.
- If a region is given, mention it naturally. If not, do not invent one.

You will receive structured JSON describing a current phenomenon and the desired tone. Return only the sentence — no quotes, no formatting.`;

export class ClaudeNarrator implements Narrator {
  readonly name = "claude";

  // Loaded lazily so the SDK stays an optional dep.
  private clientPromise: Promise<{ create: (req: ClaudeRequest) => Promise<ClaudeResponse> } | null>;

  constructor(
    private readonly apiKey: string,
    private readonly model = "claude-haiku-4-5-20251001",
    private readonly maxTokens = 80,
  ) {
    this.clientPromise = this.loadClient();
  }

  async narrate(p: Phenomenon, tone: NarrationTone, ctx: NarrationContext): Promise<string> {
    const client = await this.clientPromise;
    if (!client) {
      throw new Error(
        "ClaudeNarrator: @anthropic-ai/sdk not installed. Run `npm i @anthropic-ai/sdk` in server/.",
      );
    }

    const userPayload = {
      tone,
      phenomenon: p.kind,
      intensity: round(p.intensity, 2),
      count: p.count,
      delta_pct: p.deltaPct,
      region: p.region ?? null,
      avoid_phrasings_used_recently: ctx.recentText.slice(-4),
    };

    const resp = await client.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(userPayload) }],
      temperature: 0.7,
    });

    const text = (resp.content?.[0]?.type === "text" ? resp.content[0].text : "") ?? "";
    return text.trim().replace(/^"+|"+$/g, "");
  }

  private async loadClient() {
    try {
      // Variable-expression dynamic import → TS types this as `any`
      // regardless of whether the dep is installed. Keeps the SDK optional
      // without a stale @ts-expect-error directive.
      const path = "@anthropic-ai/sdk";
      const mod = await import(path);
      const Anthropic = mod.default ?? mod.Anthropic;
      const client = new Anthropic({ apiKey: this.apiKey });
      return {
        create: (req: ClaudeRequest) => client.messages.create(req) as Promise<ClaudeResponse>,
      };
    } catch {
      return null;
    }
  }
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  temperature?: number;
}

interface ClaudeResponse {
  content: Array<{ type: "text"; text: string } | { type: string }>;
}

function round(v: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(v * f) / f;
}
