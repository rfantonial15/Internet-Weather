import { Texture, Vector3 } from "three";
import { latLonToVec3 } from "@/utils/geo";

/**
 * Uniforms every planet shader shares. Materials spread these objects into
 * their own `uniforms` (same object references, never copies), so one write
 * per frame in `WorldClock` reaches every layer. That replaces each component
 * pulling time/sun/tension out of a store and copying it on its own.
 */
export const frameUniforms = {
  /** Seconds since the scene started. */
  uTime: { value: 0 },
  /** Unit vector toward the sun, world space. Tracks the real subsolar point. */
  uSunDir: { value: new Vector3(1, 0.25, 0).normalize() },
  /** 0..1 global tension, smoothed. */
  uTension: { value: 0.15 },
  /** Baked equirectangular map: R land, G coast falloff, B city lights. */
  uEarthMap: { value: new Texture() as Texture },
  /** 0 until the land map is baked, then eases to 1 so continents fade in. */
  uLandReady: { value: 0 },
  /**
   * Pixels per world unit at view depth 1: drawingBufferHeight / (2 tan(fov/2)).
   * Point shaders use `size * uPointScale / -mvPosition.z`, so particles keep
   * a true world size at any resolution, DPR or FOV.
   */
  uPointScale: { value: 1000 },
};

export type FrameUniforms = typeof frameUniforms;

/**
 * Subsolar point for a given instant: the spot on Earth where the sun is
 * directly overhead. Low-precision NOAA-style approximation (well under a
 * degree of error), which is far below what the globe can show.
 */
export function subsolarPoint(date: Date): { lat: number; lon: number } {
  const ms = date.getTime();
  const dayOfYear = (ms - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000;
  const g = (2 * Math.PI * (dayOfYear - 1)) / 365.25; // fractional year, radians

  // Solar declination (radians).
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  // Equation of time (minutes).
  const eot =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));

  const utcMinutes =
    date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  let lon = -((utcMinutes + eot) / 4 - 180);
  lon = ((lon + 540) % 360) - 180;

  return { lat: (decl * 180) / Math.PI, lon };
}

const _sun = new Vector3();

/** Write the current sun direction into the shared uniform. */
export function updateSunDirection(date = new Date()) {
  const p = subsolarPoint(date);
  latLonToVec3(p.lat, p.lon, 1, _sun);
  frameUniforms.uSunDir.value.copy(_sun);
}
