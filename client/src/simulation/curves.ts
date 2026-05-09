import { Vector3 } from "three";

/**
 * Geometry helpers for curves on the unit sphere. Lightweight; meant to be
 * called from hot paths so they reuse a passed-in `out` argument and never
 * allocate when given one.
 */

const _scratchA = new Vector3();
const _scratchB = new Vector3();

/** Spherical linear interpolation of two unit vectors. */
export function sphericalLerp(a: Vector3, b: Vector3, t: number, out = new Vector3()): Vector3 {
  const dot = Math.max(-1, Math.min(1, a.dot(b)));
  const omega = Math.acos(dot);
  if (omega < 1e-4) return out.copy(a);
  const sinO = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / sinO;
  const wb = Math.sin(t * omega) / sinO;
  return out
    .copy(a)
    .multiplyScalar(wa)
    .addScaledVector(b, wb);
}

/**
 * Sample N points along the great-circle arc from `a` to `b`, lifted off the
 * surface so the arc arches above the sphere. Writes into `out` starting at
 * `offset * 3` (each sample = 3 floats).
 *
 * `lift` is the peak altitude above radius 1 at the arc midpoint.
 */
export function arcPoints(
  a: Vector3,
  b: Vector3,
  segments: number,
  lift: number,
  out: Float32Array,
  offset = 0,
) {
  for (let i = 0; i < segments; i++) {
    const t = segments === 1 ? 0 : i / (segments - 1);
    sphericalLerp(a, b, t, _scratchA).normalize();
    const arch = Math.sin(t * Math.PI) * lift;
    const r = 1 + arch;
    const o = offset + i * 3;
    out[o + 0] = _scratchA.x * r;
    out[o + 1] = _scratchA.y * r;
    out[o + 2] = _scratchA.z * r;
  }
}

/** A unit tangent vector at `point` (must be unit-length), seeded by `seed`. */
export function tangentAt(point: Vector3, seed: Vector3, out = new Vector3()): Vector3 {
  out.copy(seed).sub(_scratchB.copy(point).multiplyScalar(seed.dot(point)));
  if (out.lengthSq() < 1e-6) {
    // seed was parallel to point; fall back to a fixed axis projection.
    out.set(1, 0, 0).sub(_scratchB.copy(point).multiplyScalar(point.x));
  }
  return out.normalize();
}

/** Random unit tangent vector at `point` (point must be unit-length). */
export function randomTangent(point: Vector3, out = new Vector3()): Vector3 {
  _scratchA.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
  return tangentAt(point, _scratchA, out);
}
