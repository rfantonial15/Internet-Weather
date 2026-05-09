import type { NarrationTone } from "@iw/shared";
import type { Narrator } from "./Narrator.js";
import type { Phenomenon, NarrationContext } from "./types.js";
import { TEMPLATES } from "./templates.js";

/**
 * Default narrator. Picks a tone-appropriate template, fills its placeholders
 * from the phenomenon, and applies anti-repetition (avoids reusing any of
 * the last few sentences).
 *
 * Failure mode: if no template matches the (kind, tone) pair the narrator
 * widens its search to other tones for the same phenomenon. If still nothing
 * matches, returns a tonally-neutral fallback. The engine should never see
 * an empty string from a Narrator.
 */
export class TemplateNarrator implements Narrator {
  readonly name = "template";

  async narrate(p: Phenomenon, tone: NarrationTone, ctx: NarrationContext): Promise<string> {
    const tonal = TEMPLATES[p.kind]?.[tone];
    const widened = tonal && tonal.length > 0 ? tonal : this.widen(p);
    if (!widened.length) return this.fallback(p);

    const candidates = widened.filter((t) => this.canFill(t, p));
    if (candidates.length === 0) return this.fallback(p);

    // Anti-repetition: drop any candidate equal (after fill) to recent text.
    const filled = candidates.map((t) => this.fill(t, p));
    const fresh = filled.filter((s) => !ctx.recentText.includes(s));

    const pool = fresh.length > 0 ? fresh : filled;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** Widen across tones for the same phenomenon. */
  private widen(p: Phenomenon): string[] {
    const all: string[] = [];
    const byTone = TEMPLATES[p.kind] ?? {};
    for (const arr of Object.values(byTone)) if (arr) all.push(...arr);
    return all;
  }

  private canFill(template: string, p: Phenomenon): boolean {
    if (template.includes("{pct}") && p.deltaPct === null) return false;
    if (template.includes("{region}") && !p.region) return false;
    return true;
  }

  private fill(template: string, p: Phenomenon): string {
    return template
      .replace("{count}", String(p.count))
      .replace("{pct}", p.deltaPct !== null ? String(Math.abs(p.deltaPct)) : "")
      .replace("{region}", p.region ?? "the network")
      .replace(/\s+/g, " ")
      .trim();
  }

  private fallback(p: Phenomenon): string {
    return p.region
      ? `Activity is shifting over ${p.region}.`
      : "The network is shifting.";
  }
}
