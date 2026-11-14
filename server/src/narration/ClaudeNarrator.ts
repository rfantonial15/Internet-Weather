import type { NarrationTone } from "@iw/shared";
import type { Narrator } from "../../../shared/narration/Narrator.js";
import type { Phenomenon, NarrationContext } from "../../../shared/narration/types.js";

/**
 * Claude-API-backed narrator (optional).
 *
 * Active when ANTHROPIC_API_KEY is set AND @anthropic-ai/sdk is installed.
 * The dynamic import keeps the SDK an optional dependency: the server runs
 * fine without it, falling back to the template narrator.
 *
 * Voice rules live in the system prompt (the model needs the constraints up
 * front); tone is passed explicitly so the model doesn't infer it from
 * numbers. Recent sentences are sent as phrasings to avoid.
 *
 * Model: Claude Haiku 5.5, one short sentence per narration tick (default
 * every 8 s). Low effort with thinking off: this is a one-line caption, and
 * Haiku 5.5 rejects non-default sampling parameters, so there is no
 * `temperature` here.
 *
 * To enable:
 *   npm i -w server @anthropic-ai/sdk
 *   export ANTHROPIC_API_KEY=sk-...
 */

const SYSTEM_PROMPT = `You are the narrator of "Internet Weather", a cinematic visualization that treats human civilization as a planet with weather. You speak like a hybrid of a nature documentary narrator, a weather forecaster, and a quietly awed observer of civilization.

Voice rules:
- Output exactly one sentence, under 18 words, with no exclamation marks and no dashes.
- Never address the viewer and never refer to yourself.
- Present tense or recent past. No speculation about the future.
- No company or platform names. Use phrasing that reads well aloud.
- Match the requested tone.
- If a region is given, mention it naturally. If not, do not invent one.

You receive JSON describing the current phenomenon and the desired tone. Reply with only the sentence: no quotes, no formatting.`;

const DEFAULT_MODEL = "claude-haiku-5-5";

interface TextBlock {
  type: "text";
  text: string;
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  thinking: { type: "disabled" };
  output_config: { effort: "low" };
}

interface ClaudeResponse {
  stop_reason: string | null;
  content: Array<{ type: string; text?: string }>;
}

function isText(b: { type: string; text?: string }): b is TextBlock {
  return b.type === "text" && typeof b.text === "string";
}

export class ClaudeNarrator implements Narrator {
  readonly name = "claude";

  // Loaded lazily so the SDK stays an optional dependency.
  private clientPromise: Promise<{ create: (req: ClaudeRequest) => Promise<ClaudeResponse> } | null>;

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.IW_NARRATOR_MODEL || DEFAULT_MODEL,
    private readonly maxTokens = 200,
  ) {
    this.clientPromise = this.loadClient();
  }

  /** True when the SDK loaded; the host falls back to templates otherwise. */
  async ready(): Promise<boolean> {
    return (await this.clientPromise) !== null;
  }

  async narrate(p: Phenomenon, tone: NarrationTone, ctx: NarrationContext): Promise<string> {
    const client = await this.clientPromise;
    if (!client) {
      throw new Error("ClaudeNarrator: @anthropic-ai/sdk is not installed (npm i -w server @anthropic-ai/sdk)");
    }

    const payload = {
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
      messages: [{ role: "user", content: JSON.stringify(payload) }],
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
    });

    // A declined request is HTTP 200 with stop_reason "refusal": skip this tick.
    if (resp.stop_reason === "refusal") throw new Error("narration declined");

    const text = resp.content.find(isText)?.text ?? "";
    // Captions never use em or en dashes; a stray one becomes a comma.
    return text.trim().replace(/^"+|"+$/g, "").replace(/\s*[—–]\s*/g, ", ");
  }

  private async loadClient() {
    try {
      // A variable specifier keeps TypeScript from requiring the package at
      // build time, so the SDK can stay optional.
      const specifier = "@anthropic-ai/sdk";
      const mod = await import(specifier);
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

function round(v: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(v * f) / f;
}
