import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CameraDirector } from "@/core/camera/cameraDirector";
import { CAMERA } from "@/config/constants";
import { latLonToVec3 } from "@/utils/geo";

function settle(d: CameraDirector, seconds: number, out = new Vector3()) {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) d.step(dt, out);
  return out;
}

describe("CameraDirector", () => {
  it("frames the globe further back on a portrait phone than on a desktop", () => {
    const desk = new CameraDirector();
    desk.setAspect(16 / 9);
    const phone = new CameraDirector();
    phone.setAspect(390 / 844);
    expect(phone.distance).toBeGreaterThan(desk.distance);
    // The globe (radius 1) must fit: half-angle of the globe < half the FOV.
    const half = (CAMERA.baseFov * Math.PI) / 360;
    expect(Math.asin(1 / desk.distance)).toBeLessThan(half);
  });

  it("keeps a user zoom across a resize", () => {
    const d = new CameraDirector();
    d.setAspect(16 / 9);
    d.zoomBy(0.6);
    settle(d, 4);
    const zoomed = d.distance;
    d.setAspect(4 / 3);
    settle(d, 4);
    expect(d.distance).toBeCloseTo(zoomed, 2);
  });

  it("clamps zoom to the configured range", () => {
    const d = new CameraDirector();
    d.setAspect(16 / 9);
    d.zoomBy(1000);
    settle(d, 8);
    expect(d.distance).toBeCloseTo(CAMERA.maxDistance, 1);
    d.zoomBy(0.0001);
    settle(d, 8);
    expect(d.distance).toBeCloseTo(d.minDistance, 1);
    expect(d.minDistance).toBeGreaterThanOrEqual(CAMERA.minDistance);
  });

  it("stops a tall phone further out than a desktop at full zoom", () => {
    const desk = new CameraDirector();
    desk.setAspect(16 / 9);
    const phone = new CameraDirector();
    phone.setAspect(390 / 844);
    expect(phone.minDistance).toBeGreaterThan(desk.minDistance * 1.4);
  });

  it("turns to face a focus target the short way, even after many idle turns", () => {
    const d = new CameraDirector();
    d.setAspect(16 / 9);
    // Accumulate several full idle orbits.
    const out = new Vector3();
    for (let i = 0; i < 60 * 600; i++) {
      d.setIdle(1 / 60, 0.2);
      d.step(1 / 60, out);
    }
    const before = out.clone().normalize();
    const target = latLonToVec3(14.6, 121.0); // Manila
    d.setFocus(target, 2.6);

    // Track the largest per-frame swing: an unwinding camera would sweep
    // through several turns; a short-way turn rotates at most half a turn.
    let swept = 0;
    let prev = before.clone();
    const dt = 1 / 60;
    for (let t = 0; t < 10; t += dt) {
      d.step(dt, out);
      const cur = out.clone().normalize();
      swept += prev.angleTo(cur);
      prev = cur;
    }
    expect(out.clone().normalize().dot(target)).toBeGreaterThan(0.999);
    expect(d.distance).toBeCloseTo(2.6, 2);
    expect(swept).toBeLessThan(Math.PI + 0.2);
  });

  it("never lets pitch flip over the poles", () => {
    const d = new CameraDirector();
    d.setAspect(16 / 9);
    d.rotateBy(0, 50);
    const out = settle(d, 6);
    const n = out.clone().normalize();
    expect(Math.asin(n.y)).toBeLessThanOrEqual(1.25 + 1e-6);
  });
});
