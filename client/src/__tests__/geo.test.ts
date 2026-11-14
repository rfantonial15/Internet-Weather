import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { latLonToVec3, vec3ToGeo } from "@/utils/geo";
import { subsolarPoint } from "@/core/frameUniforms";
import { nearestCity, placeLabel } from "@/utils/places";

describe("lat/lon <-> vector", () => {
  it("puts (0, 0) on +X and the north pole on +Y", () => {
    const a = latLonToVec3(0, 0);
    expect(a.x).toBeCloseTo(1, 6);
    expect(a.y).toBeCloseTo(0, 6);
    expect(a.z).toBeCloseTo(0, 6);
    expect(latLonToVec3(90, 0).y).toBeCloseTo(1, 6);
  });

  it("round-trips across the globe", () => {
    for (let lat = -80; lat <= 80; lat += 20) {
      for (let lon = -170; lon <= 170; lon += 34) {
        const g = vec3ToGeo(latLonToVec3(lat, lon, 1.7));
        expect(g.lat).toBeCloseTo(lat, 6);
        expect(g.lon).toBeCloseTo(lon, 6);
      }
    }
  });

  it("returns longitudes inside [-180, 180]", () => {
    for (let lon = -180; lon <= 180; lon += 7.5) {
      const g = vec3ToGeo(latLonToVec3(10, lon));
      expect(g.lon).toBeGreaterThanOrEqual(-180);
      expect(g.lon).toBeLessThanOrEqual(180);
    }
  });

  it("handles a non-unit vector", () => {
    const g = vec3ToGeo(new Vector3(0, 5, 0));
    expect(g.lat).toBeCloseTo(90, 6);
  });
});

describe("subsolar point", () => {
  it("sits on the Tropic of Cancer at the June solstice, near Greenwich at noon UTC", () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)));
    expect(p.lat).toBeGreaterThan(23);
    expect(p.lat).toBeLessThan(23.6);
    expect(Math.abs(p.lon)).toBeLessThan(2);
  });

  it("sits on the Tropic of Capricorn at the December solstice", () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 11, 21, 12, 0, 0)));
    expect(p.lat).toBeLessThan(-23);
    expect(p.lat).toBeGreaterThan(-23.6);
  });

  it("crosses the equator at the March equinox", () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 12, 0, 0)));
    expect(Math.abs(p.lat)).toBeLessThan(0.7);
  });

  it("is over the antimeridian at midnight UTC and moves west 15 degrees an hour", () => {
    const midnight = subsolarPoint(new Date(Date.UTC(2026, 8, 1, 0, 0, 0)));
    expect(180 - Math.abs(midnight.lon)).toBeLessThan(4);
    const a = subsolarPoint(new Date(Date.UTC(2026, 8, 1, 6, 0, 0)));
    const b = subsolarPoint(new Date(Date.UTC(2026, 8, 1, 7, 0, 0)));
    expect(a.lon - b.lon).toBeCloseTo(15, 0);
  });
});

describe("places", () => {
  it("finds the city a point sits in", () => {
    const c = nearestCity({ lat: 35.7, lon: 139.7 });
    expect(c.name).toBe("Tokyo");
    expect(c.km).toBeLessThan(1);
  });

  it("says 'near' for close points and gives a distance for remote ones", () => {
    expect(placeLabel({ lat: 14.6, lon: 121.0 })).toBe("near Manila");
    const remote = placeLabel({ lat: -48, lon: -125 }); // South Pacific
    expect(remote).toMatch(/^[\d,]+ km from /);
  });

  it("measures across the antimeridian", () => {
    // Just east of the date line, closest to a Pacific city on the other side.
    const c = nearestCity({ lat: 21.3, lon: -157.9 });
    expect(c.name).toBe("Honolulu");
  });
});
