import type { NarrationTone } from "../types.js";
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
    const usable = (lines: string[]) => lines.filter((t) => this.canFill(t, p));
    const fresh = (lines: string[]) =>
      lines.map((t) => this.fill(t, p)).filter((s) => !ctx.recentText.includes(s));

    // Prefer a fresh line in the requested tone, then a fresh line in any
    // tone for this phenomenon, and only repeat a recent line as a last
    // resort. Thin tone buckets used to repeat the same sentence back to back.
    const tonal = usable(TEMPLATES[p.kind]?.[tone] ?? []);
    let pool = fresh(tonal);
    if (pool.length === 0) pool = fresh(usable(this.widen(p)));
    if (pool.length === 0) pool = tonal.map((t) => this.fill(t, p));
    if (pool.length === 0) return this.fallback(p);
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
    // Every {pct} template reads as an increase ("40% above baseline"), so a
    // flat or falling rate must not fill one: the old Math.abs turned a 40%
    // drop into "40% above baseline".
    if (template.includes("{pct}") && (p.deltaPct === null || p.deltaPct < 10)) return false;
    if (template.includes("{region}") && !p.region) return false;
    return true;
  }

  private fill(template: string, p: Phenomenon): string {
    return template
      .replace("{count}", String(p.count))
      .replace("{pct}", p.deltaPct !== null ? String(p.deltaPct) : "")
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
