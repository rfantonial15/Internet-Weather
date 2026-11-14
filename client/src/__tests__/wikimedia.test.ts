import { describe, expect, it } from "vitest";
import { cityForLang, RateGate, WikiClassifier, wikipediaLang, type RecentChange } from "@iw/shared/wikimedia";
import { nearestCity } from "@/utils/places";

const base = (over: Partial<RecentChange> = {}): RecentChange => ({
  type: "edit",
  namespace: 0,
  server_name: "de.wikipedia.org",
  bot: false,
  title: "Beispielseite",
  comment: "Tippfehler",
  length: { old: 1000, new: 1040 },
  ...over,
});

describe("wikipedia changes as weather", () => {
  it("reads the language from the host and ignores other projects", () => {
    expect(wikipediaLang("ja.wikipedia.org")).toBe("ja");
    expect(wikipediaLang("commons.wikimedia.org")).toBeNull();
    expect(wikipediaLang("www.wikidata.org")).toBeNull();
  });

  it("places a language near its cities, and a page always at the same one", () => {
    const a = cityForLang("ja", "ja:Page");
    expect(["Tokyo", "Osaka", "Nagoya"]).toContain(a!.name);
    expect(cityForLang("ja", "ja:Page")!.name).toBe(a!.name);
    expect(cityForLang("xx", "anything")).toBeNull();
  });

  it("skips bots, non-articles and unknown languages", () => {
    const c = new WikiClassifier(() => 0.5);
    expect(c.classify(base({ bot: true }), 0)).toBeNull();
    expect(c.classify(base({ namespace: 1 }), 0)).toBeNull();
    expect(c.classify(base({ server_name: "xx.wikipedia.org" }), 0)).toBeNull();
    expect(c.classify(base({ type: "categorize" }), 0)).toBeNull();
  });

  it("draws a new article as a build near the language's cities", () => {
    const s = new WikiClassifier(() => 0.5).classify(base({ type: "new", length: { new: 5000 } }), 0)!;
    expect(s.kind).toBe("build");
    expect(s.filler).toBe(false);
    expect(["Berlin", "Munich", "Rhine-Ruhr", "Vienna"]).toContain(nearestCity(s.at).name);
  });

  it("turns reverts into controversy, and repeated reverts into an edit war", () => {
    const c = new WikiClassifier(() => 0.5);
    const first = c.classify(base({ comment: "Änderungen rückgängig gemacht" }), 1000)!;
    expect(first.kind).toBe("controversy");
    const second = c.classify(base({ comment: "Reverted edits by someone" }), 2000)!;
    expect(second.kind).toBe("rage");
    expect(second.label).toBe("edit war · de");
  });

  it("escalates a page that keeps getting edited", () => {
    const c = new WikiClassifier(() => 0.3);
    const kinds: string[] = [];
    for (let i = 0; i < 10; i++) kinds.push(c.classify(base({ title: "Hot" }), i * 1000)!.kind);
    expect(kinds[2]).toBe("trend");
    expect(kinds[5]).toBe("viral");
    expect(kinds[9]).toBe("news");
  });

  it("forgets old edits", () => {
    const c = new WikiClassifier(() => 0.3);
    c.classify(base({ title: "Old" }), 0);
    c.classify(base({ title: "Old" }), 1000);
    // 11 minutes later: the window has passed, so this is not the 3rd edit.
    expect(c.classify(base({ title: "Old" }), 11 * 60_000)!.kind).toBe("build");
  });

  it("draws blocks, protections, sign-ups and blanking", () => {
    const c = new WikiClassifier(() => 0.3);
    const log = (log_type: string) => c.classify({ type: "log", log_type, server_name: "en.wikipedia.org", title: "X" }, 0)!;
    expect(log("block").kind).toBe("rage");
    expect(log("protect").kind).toBe("news");
    expect(log("newusers").kind).toBe("wholesome");
    expect(c.classify({ type: "log", log_type: "upload", server_name: "en.wikipedia.org" }, 0)).toBeNull();
    const blank = c.classify(base({ title: "Blanked", length: { old: 8000, new: 300 } }), 0)!;
    expect(blank.kind).toBe("rage");
    expect(blank.label).toBe("page blanked · de");
  });

  it("draws about half of the routine edits", () => {
    let i = 0;
    const seq = [0.1, 0.9]; // alternate: kept, dropped
    const c = new WikiClassifier(() => seq[i++ % 2]);
    let kept = 0;
    for (let k = 0; k < 40; k++) if (c.classify(base({ title: `P${k}` }), k)) kept++;
    expect(kept).toBeGreaterThan(5);
    expect(kept).toBeLessThan(35);
  });

  it("turns thanks into kindness and never puts titles or users in labels", () => {
    const c = new WikiClassifier(() => 0.3);
    const t = c.classify({ type: "log", log_type: "thanks", server_name: "en.wikipedia.org", title: "User:Someone" }, 0)!;
    expect(t.kind).toBe("wholesome");
    const e = c.classify(base({ title: "Secret Title" }), 0)!;
    expect(e.label).not.toMatch(/Secret|Title|Someone/);
  });
});

describe("rate gate", () => {
  it("caps the rate and keeps room for rare signals", () => {
    const g = new RateGate(4, 8, 0);
    let filler = 0;
    for (let i = 0; i < 20; i++) if (g.allow(true, 0)) filler++;
    expect(filler).toBe(4); // filler stops at half the bucket
    expect(g.allow(false, 0)).toBe(true); // a rare signal still gets through
    let later = 0;
    for (let i = 0; i < 100; i++) if (g.allow(false, 10_000)) later++;
    expect(later).toBe(8); // refilled to the burst size, not beyond
  });
});
