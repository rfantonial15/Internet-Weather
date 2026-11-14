import { describe, expect, it, vi } from "vitest";
import type { EventKind, WeatherEvent } from "@iw/shared";
import { makeSimEvent, simBurstSize } from "@iw/shared/simulation";
import { CITIES } from "@iw/shared/cities";
import { EventClassifier } from "@iw/shared/narration/EventClassifier";
import { NarrationEngine } from "@iw/shared/narration/NarrationEngine";
import { TemplateNarrator } from "@iw/shared/narration/TemplateNarrator";
import { TEMPLATES } from "@iw/shared/narration/templates";
import { regionForGeo } from "@iw/shared/narration/regions";
import { nearestCity } from "@/utils/places";

/** Deterministic PRNG so the simulation tests are repeatable. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let n = 0;
function ev(kind: EventKind, at = { lat: 48.9, lon: 2.4 }, intensity = 0.6, ageMs = 1000): WeatherEvent {
  return { id: `n_${n++}`, kind, intensity, t: Date.now() - ageMs, at, source: "test" };
}

describe("simulation", () => {
  it("produces valid events near real cities", () => {
    const rand = mulberry32(7);
    const ids = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const e = makeSimEvent(i, rand);
      ids.add(e.id);
      expect(e.intensity).toBeGreaterThanOrEqual(0);
      expect(e.intensity).toBeLessThanOrEqual(1);
      expect(Math.abs(e.at!.lat)).toBeLessThanOrEqual(85);
      expect(Math.abs(e.at!.lon)).toBeLessThanOrEqual(180);
      // Jitter is at most a couple of degrees, so it lands within ~800 km.
      expect(nearestCity(e.at!).km).toBeLessThan(800);
    }
    expect(ids.size).toBe(500);
  });

  it("bursts 1 to 3 events", () => {
    const rand = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const b = simBurstSize(rand);
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(3);
    }
  });

  it("has a sane city list", () => {
    const names = new Set(CITIES.map((c) => c.name));
    expect(names.size).toBe(CITIES.length);
    for (const c of CITIES) {
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
      expect(c.pop).toBeGreaterThan(0);
    }
  });
});

describe("classifier", () => {
  it("narrates the silence when nothing is happening", () => {
    const p = new EventClassifier().classify([], Date.now());
    expect(p[0].kind).toBe("quiet");
  });

  it("detects a rage storm and places it", () => {
    const es = Array.from({ length: 6 }, () => ev("rage"));
    const p = new EventClassifier().classify(es, Date.now());
    const storm = p.find((x) => x.kind === "rage_storm");
    expect(storm).toBeDefined();
    expect(storm!.region).toBe("western Europe");
  });

  it("puts a big news event above background chatter", () => {
    const es = [...Array.from({ length: 3 }, () => ev("rage")), ev("news", { lat: 40.7, lon: -74 }, 0.95)];
    const p = new EventClassifier().classify(es, Date.now());
    expect(p[0].kind).toBe("news_shock");
    expect(p[0].region).toBe("North America");
  });

  it("ignores events older than the window", () => {
    const es = Array.from({ length: 10 }, () => ev("rage", undefined, 0.6, 120_000));
    const p = new EventClassifier().classify(es, Date.now());
    expect(p.find((x) => x.kind === "rage_storm")).toBeUndefined();
  });

  it("names no region for activity spread around the world", () => {
    const spots = [
      { lat: 40.7, lon: -74 }, { lat: 35.7, lon: 139.7 }, { lat: -23.5, lon: -46.6 },
      { lat: 51.5, lon: -0.1 }, { lat: 19.1, lon: 72.9 }, { lat: -33.9, lon: 151.2 },
    ];
    const es = spots.map((at) => ev("viral", at, 0.6));
    const surge = new EventClassifier().classify(es, Date.now()).find((x) => x.kind === "viral_surge");
    expect(surge).toBeDefined();
    expect(surge!.region).toBeUndefined();
  });

  it("names the region that holds most of the activity", () => {
    const es = [
      ...Array.from({ length: 5 }, () => ev("meme", { lat: 35.7, lon: 139.7 })),
      ev("meme", { lat: 40.7, lon: -74 }),
      ev("meme", { lat: 51.5, lon: -0.1 }),
    ];
    const m = new EventClassifier().classify(es, Date.now()).find((x) => x.kind === "meme_migration");
    expect(m!.region).toBe("East Asia");
    expect(m!.centroid!.lon).toBeCloseTo(139.7, 1);
  });

  it("reports no percentage until the baseline has warmed up", () => {
    const c = new EventClassifier();
    const deltas: Array<number | null> = [];
    for (let i = 0; i < 14; i++) {
      const es = Array.from({ length: 4 + (i % 3) }, () => ev("rage"));
      deltas.push(c.classify(es, Date.now()).find((x) => x.kind === "rage_storm")!.deltaPct);
    }
    expect(deltas.slice(0, 11).every((d) => d === null)).toBe(true);
    expect(deltas.slice(12).every((d) => typeof d === "number")).toBe(true);
  });
});

describe("regions", () => {
  it("names familiar places", () => {
    expect(regionForGeo(35.7, 139.7)).toBe("East Asia");
    expect(regionForGeo(-33.9, 151.2)).toBe("Oceania");
    expect(regionForGeo(-23.5, -46.6)).toBe("South America");
  });
});

describe("narrator", () => {
  it("never uses dashes or exclamation marks in its sentences", () => {
    for (const byTone of Object.values(TEMPLATES)) {
      for (const lines of Object.values(byTone)) {
        for (const line of lines ?? []) {
          expect(line).not.toMatch(/[—–!]/);
        }
      }
    }
  });

  it("does not call a falling rate 'above baseline'", async () => {
    const nar = new TemplateNarrator();
    const ctx = { tension: 0.3, totalEventsInWindow: 10, recentText: [] };
    for (const kind of ["rage_storm", "meme_migration", "build_wave", "trend_rising", "viral_surge", "controversy_front"] as const) {
      for (let i = 0; i < 40; i++) {
        const text = await nar.narrate(
          { kind, intensity: 0.5, salience: 0.5, count: 9, deltaPct: -40, region: "East Asia", refs: [] },
          i % 2 ? "observational" : "electric",
          ctx,
        );
        expect(text).not.toMatch(/%/);
      }
    }
  });

  it("fills a percentage only from a real increase", async () => {
    const nar = new TemplateNarrator();
    const ctx = { tension: 0.3, totalEventsInWindow: 10, recentText: [] };
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      seen.add(
        await nar.narrate(
          { kind: "meme_migration", intensity: 0.5, salience: 0.5, count: 9, deltaPct: 140, refs: [] },
          "electric",
          ctx,
        ),
      );
    }
    for (const s of seen) {
      expect(s).not.toMatch(/\{|\}|null|undefined|NaN/);
      if (s.includes("%")) expect(s).toMatch(/140%/);
    }
  });

  it("emits a narration from live events and avoids repeating itself", async () => {
    const engine = new NarrationEngine(new TemplateNarrator(), { minGapMs: 0 });
    const out: string[] = [];
    engine.onNarration = (x) => out.push(x.text);
    for (let i = 0; i < 6; i++) engine.observe(ev("rage"));
    for (let i = 0; i < 5; i++) engine.observe(ev("wholesome", { lat: 35.7, lon: 139.7 }));
    await engine.tick();
    await engine.tick();
    await engine.tick();
    expect(out.length).toBe(3);
    for (const s of out) expect(s.length).toBeGreaterThan(5);
    expect(new Set(out).size).toBe(out.length);
  });

  it("survives a failing narrator", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const engine = new NarrationEngine(
      { name: "broken", narrate: async () => { throw new Error("down"); } },
      { minGapMs: 0 },
    );
    const out: string[] = [];
    engine.onNarration = (x) => out.push(x.text);
    engine.observe(ev("rage"));
    await engine.tick();
    expect(out).toHaveLength(0);
    warn.mockRestore();
  });
});
