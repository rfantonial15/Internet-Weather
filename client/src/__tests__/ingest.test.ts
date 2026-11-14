import { beforeEach, describe, expect, it } from "vitest";
import type { WeatherEvent } from "@iw/shared";
import { ingest } from "@/realtime/eventMapper";
import { useEventStore } from "@/state/useEventStore";

let n = 0;
const uid = () => `test_${Date.now()}_${n++}`;

function ev(over: Partial<WeatherEvent> = {}): WeatherEvent {
  return {
    id: uid(),
    kind: "rage",
    intensity: 0.5,
    t: 0,
    at: { lat: 10, lon: 20 },
    label: "flame war",
    source: "test",
    ...over,
  };
}

const events = () => useEventStore.getState().events;

describe("ingest", () => {
  beforeEach(() => useEventStore.getState().clear());

  it("accepts a valid event and restamps its time locally", () => {
    const before = Date.now();
    ingest(ev({ t: 123 }));
    expect(events()).toHaveLength(1);
    expect(events()[0].t).toBeGreaterThanOrEqual(before);
  });

  it("drops a duplicate id", () => {
    const e = ev();
    ingest(e);
    ingest({ ...e });
    expect(events()).toHaveLength(1);
  });

  it("drops unknown kinds and malformed frames", () => {
    ingest(ev({ kind: "tornado" as WeatherEvent["kind"] }));
    ingest(null as unknown as WeatherEvent);
    ingest({ kind: "rage" } as unknown as WeatherEvent);
    expect(events()).toHaveLength(0);
  });

  it("clamps intensity and coordinates", () => {
    ingest(ev({ intensity: 7, at: { lat: 120, lon: 190 } }));
    ingest(ev({ intensity: Number.NaN }));
    const [a, b] = events();
    expect(a.intensity).toBe(1);
    expect(a.at).toEqual({ lat: 90, lon: -170 });
    expect(b.intensity).toBe(0.5);
  });

  it("drops non-finite coordinates instead of placing them at 0,0", () => {
    ingest(ev({ at: { lat: Number.NaN, lon: 3 } }));
    expect(events()[0].at).toBeUndefined();
  });

  it("caps label and source length", () => {
    ingest(ev({ label: "x".repeat(500), source: "y".repeat(500) }));
    expect(events()[0].label).toHaveLength(64);
    expect(events()[0].source).toHaveLength(32);
  });

  it("keeps the store bounded", () => {
    for (let i = 0; i < 300; i++) ingest(ev());
    expect(events().length).toBeLessThanOrEqual(256);
  });
});
