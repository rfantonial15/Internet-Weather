import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  InstancedMesh,
  Object3D,
  Color,
  RingGeometry,
  MeshBasicMaterial,
  AdditiveBlending,
  Vector3,
  DoubleSide,
} from "three";
import { visualByKind } from "./eventTypes";
import { eventAge, eventUnit } from "./eventGeo";
import { EARTH_RADIUS, EVENTS } from "@/config/constants";
import { useEventStore } from "@/state/useEventStore";
import { easeOutCubic } from "@/utils/easing";

/** Ring geometry lies in XY; its normal is +Z. */
const NORMAL = new Vector3(0, 0, 1);

/**
 * Expanding shockwave rings laid tangent to the surface. A thin annulus
 * scaled up over the life of the event, fading as it grows.
 */
export function EventRipple() {
  const meshRef = useRef<InstancedMesh>(null!);
  const dummy = useMemo(() => new Object3D(), []);
  const tmpColor = useMemo(() => new Color(), []);
  const geom = useMemo(() => new RingGeometry(0.86, 1, 64, 1), []);
  const mat = useMemo(
    () =>
      new MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        side: DoubleSide,
      }),
    [],
  );
  useEffect(
    () => () => {
      geom.dispose();
      mat.dispose();
    },
    [geom, mat],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const events = useEventStore.getState().events;
    const now = Date.now();

    let i = 0;
    for (const e of events) {
      const map = visualByKind[e.kind];
      if (!map.ripple) continue;
      const unit = eventUnit(e);
      if (!unit || i >= EVENTS.poolSize) continue;
      const age = eventAge(e, now);
      if (age < 0 || age >= 1) continue;

      dummy.position.copy(unit).multiplyScalar(EARTH_RADIUS * 1.002);
      dummy.quaternion.setFromUnitVectors(NORMAL, unit);
      const r = 0.004 + easeOutCubic(age) * (0.04 + e.intensity * EVENTS.rippleScale);
      dummy.scale.set(r, r, r);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const alpha = (1 - age) * (1 - age) * (0.25 + e.intensity * 0.45);
      tmpColor.set(map.color).multiplyScalar(alpha);
      mesh.setColorAt(i, tmpColor);
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geom, mat, EVENTS.poolSize]} frustumCulled={false} />;
}
