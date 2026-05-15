import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  InstancedMesh,
  Object3D,
  Color,
  CircleGeometry,
  MeshBasicMaterial,
  AdditiveBlending,
  Vector3,
  Quaternion,
  DoubleSide,
} from "three";
import { visualByKind } from "./eventTypes";
import { geoToVec3 } from "@/utils/geo";
import { EARTH_RADIUS, EVENTS } from "@/config/constants";
import { useWorldStore } from "@/state/useWorldStore";
import { useEventStore } from "@/state/useEventStore";
import { easeOutCubic } from "@/utils/easing";

/**
 * Expanding ring shockwaves laid flat against the surface. Reads events
 * lazily from the store inside useFrame; doesn't subscribe to React.
 */
export function EventRipple() {
  const meshRef = useRef<InstancedMesh>(null!);
  const dummy = useMemo(() => new Object3D(), []);
  const q = useMemo(() => new Quaternion(), []);
  const up = useMemo(() => new Vector3(0, 0, 1), []); // disc normal
  const dir = useMemo(() => new Vector3(), []);
  const tmpColor = useMemo(() => new Color(), []);

  // Ring built from a thin annulus circle geometry with a radial alpha gradient.
  // We use a ring-ish geometry: a circle scaled, relying on the additive
  // blend + center hole emerging from a custom UV trick is overkill —
  // instead we use the geometry as a filled disc and modulate via shader-less
  // color falloff in the cylinder. Simpler: use TorusGeometry instead.
  // Switching to a thin torus.
  const geom = useMemo(() => {
    const g = new CircleGeometry(1, 64);
    return g;
  }, []);

  const mat = useMemo(
    () =>
      new MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        side: DoubleSide,
        opacity: 0.5,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const events = useEventStore.getState().events;
    const now = useWorldStore.getState().elapsed * 1000 + performance.timeOrigin;

    let i = 0;
    for (const e of events) {
      if (!e.at || i >= EVENTS.poolSize) continue;
      const map = visualByKind[e.kind];
      if (!map.ripple) continue;

      const life = EVENTS.baseLifespanMs * map.lifeMul * (0.6 + e.intensity);
      const ageT = (now - e.t) / life;
      if (ageT >= 1) continue;

      const base = geoToVec3(e.at, EARTH_RADIUS * 1.002);
      dir.copy(base).normalize();

      // Disc sits tangent to the surface — orient its normal along `dir`.
      dummy.position.copy(base);
      q.setFromUnitVectors(up, dir);
      dummy.quaternion.copy(q);

      const r = easeOutCubic(ageT) * (0.15 + e.intensity * EVENTS.rippleScale);
      dummy.scale.set(r, r, r);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const alpha = (1 - ageT) * (0.4 + e.intensity * 0.6);
      tmpColor.set(map.color).multiplyScalar(alpha);
      mesh.setColorAt(i, tmpColor);
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geom, mat, EVENTS.poolSize]}
      frustumCulled={false}
    />
  );
}
