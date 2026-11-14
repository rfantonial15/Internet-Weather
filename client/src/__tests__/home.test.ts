import { describe, expect, it } from "vitest";
import type { EventKind, WeatherEvent } from "@iw/shared";
import { cityByName, cityForZone } from "@/utils/home";
import { localReport } from "@/utils/localWeather";
import { kmBetween } from "@/utils/places";

describe("home city from the time zone", () => {
  it("matches zones named after a listed city", () => {
    expect(cityForZone("Asia/Manila", 480).name).toBe("Manila");
    expect(cityForZone("America/New_York", -300).name).toBe("New York");
    expect(cityForZone("America/Argentina/Buenos_Aires", -180).name).toBe("Buenos Aires");
    expect(cityForZone("America/Sao_Paulo", -180).name).toBe("Sao Paulo");
  });

  it("knows old and alternate zone names", () => {
    expect(cityForZone("Asia/Calcutta", 330).name).toBe("Kolkata");
    expect(cityForZone("Asia/Saigon", 420).name).toBe("Ho Chi Minh City");
    expect(cityForZone("Europe/Kiev", 120).name).toBe("Kyiv");
  });

  it("falls back to a big metro on the zone's meridian, in the right area", () => {
    const c = cityForZone("Europe/Ljubljana", 60);
    expect(c.lat).toBeGreaterThan(34);
    expect(Math.abs(c.lon - 15)).toBeLessThan(13);
    const a = cityForZone("Africa/Ndjamena", 60);
    expect(a.lat).toBeLessThan(38);
  });

  it("finds cities by name loosely", () => {
    expect(cityByName("sao paulo")?.name).toBe("Sao Paulo");
    expect(cityByName("CAGAYAN DE ORO")?.name).toBe("Cagayan de Oro");
    expect(cityByName("Atlantis")).toBeNull();
  });
});

describe("local weather", () => {
  const manila = { lat: 14.6, lon: 121.0 };
  let n = 0;
  const ev = (kind: EventKind, at: { lat: number; lon: number }, ageMs: number): WeatherEvent => ({
    id: `l${n++}`,
    kind,
    intensity: 0.5,
    t: 1_000_000 - ageMs,
    at,
    source: "test",
  });
  const now = 1_000_000;

  it("measures distance on the sphere", () => {
    expect(kmBetween(manila, { lat: 35.7, lon: 139.7 })).toBeGreaterThan(2900);
    expect(kmBetween(manila, { lat: 35.7, lon: 139.7 })).toBeLessThan(3100);
  });

  it("reports clear skies when nothing is nearby", () => {
    const r = localReport([ev("rage", { lat: 51.5, lon: 0 }, 1000)], manila, now);
    expect(r.headline).toBe("Clear skies");
    expect(r.total).toBe(0);
  });

  it("names the dominant nearby weather with a strength", () => {
    const es = [
      ev("meme", { lat: 14.5, lon: 121.1 }, 5000),
      ev("meme", { lat: 13.9, lon: 120.6 }, 9000),
      ev("meme", { lat: 10.3, lon: 123.9 }, 12000), // Cebu, ~570 km
      ev("rage", { lat: 15.0, lon: 120.9 }, 3000),
      ev("rage", { lat: 51.5, lon: 0 }, 1000), // London, ignored
      ev("meme", { lat: 14.6, lon: 121.0 }, 90_000), // too old
    ];
    const r = localReport(es, manila, now);
    expect(r.total).toBe(4);
    expect(r.dominant).toBe("meme");
    expect(r.headline).toBe("Moderate meme swarms");
  });

  it("says whether activity is building or easing", () => {
    const building = [0, 1, 2, 3].map((i) => ev("build", manila, 2000 + i * 1000));
    expect(localReport(building, manila, now).trend).toBe("building");
    const easing = [0, 1, 2, 3].map((i) => ev("build", manila, 40_000 + i * 1000));
    expect(localReport(easing, manila, now).trend).toBe("easing");
  });
});
