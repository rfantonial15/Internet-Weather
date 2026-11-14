import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  InstancedMesh,
  Object3D,
  Color,
  CylinderGeometry,
  MeshBasicMaterial,
  AdditiveBlending,
  Vector3,
} from "three";
import { visualByKind } from "./eventTypes";
import { eventAge, eventUnit } from "./eventGeo";
import { EARTH_RADIUS, EVENTS } from "@/config/constants";
import { useEventStore } from "@/state/useEventStore";
import { frameUniforms } from "@/core/frameUniforms";

const UP = new Vector3(0, 1, 0);

/**
 * Vertical light beams from the surface for high-energy kinds (rage, news,
 * viral, controversy): open cylinders pointing radially outward.
 */
export function EventBeam() {
  const meshRef = useRef<InstancedMesh>(null!);
  const dummy = useMemo(() => new Object3D(), []);
  const tmpColor = useMemo(() => new Color(), []);
  const geom = useMemo(() => new CylinderGeometry(1, 1, 1, 10, 1, true), []);
  const mat = useMemo(
    () =>
      new MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        opacity: 0.85,
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
    const zoom = frameUniforms.uMarkerScale.value;

    let i = 0;
    for (const e of events) {
      const map = visualByKind[e.kind];
      if (!map.beam) continue;
      const unit = eventUnit(e);
      if (!unit || i >= EVENTS.poolSize) continue;
      const age = eventAge(e, now);
      if (age < 0 || age >= 1) continue;

      const fade = 1 - age;
      const height = (0.1 + e.intensity * 0.28) * (0.6 + fade * 0.4) * zoom;
      const radius = 0.0025 * (0.5 + e.intensity) * zoom;
      dummy.position.copy(unit).multiplyScalar(EARTH_RADIUS + height * 0.5);
      dummy.quaternion.setFromUnitVectors(UP, unit);
      dummy.scale.set(radius, height, radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tmpColor.set(map.color).multiplyScalar(1.4 * fade + 0.4);
      mesh.setColorAt(i, tmpColor);
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geom, mat, EVENTS.poolSize]} frustumCulled={false} />;
}
