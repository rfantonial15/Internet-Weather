import { Vector3 } from "three";
import type { GeoPoint } from "@iw/shared";

/**
 * Convert latitude/longitude to a unit vector on the sphere.
 * Lat/lon are in degrees. The globe's equator lies on the XZ plane;
 * +Y is north, +X intersects (lat=0, lon=0).
 */
export function latLonToVec3(lat: number, lon: number, radius = 1, target = new Vector3()): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return target.set(x, y, z);
}

export function geoToVec3(p: GeoPoint, radius = 1, target?: Vector3): Vector3 {
  return latLonToVec3(p.lat, p.lon, radius, target);
}

/** Random point on a sphere of given radius (uniform distribution). */
export function randomOnSphere(radius = 1, target = new Vector3()): Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return target.set(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}
