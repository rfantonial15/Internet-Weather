import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  InstancedMesh,
  Object3D,
  Color,
  CylinderGeometry,
  MeshBasicMaterial,
  AdditiveBlending,
  Vector3,
  Quaternion,
} from "three";
import { visualByKind } from "./eventTypes";
import { geoToVec3 } from "@/utils/geo";
import { EARTH_RADIUS, EVENTS } from "@/config/constants";
import { useWorldStore } from "@/state/useWorldStore";
import { useEventStore } from "@/state/useEventStore";

/**
 * Vertical light beams projecting from the surface for high-energy event
 * kinds (rage, news, viral, controversy). Cylinders pointing radially out.
 *
 * Reads events lazily from the store inside useFrame — this component
 * doesn't subscribe, so the high-frequency event push doesn't trigger
 * React re-renders.
 */
export function EventBeam() {
  const meshRef = useRef<InstancedMesh>(null!);
  const dummy = useMemo(() => new Object3D(), []);
  const q = useMemo(() => new Quaternion(), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);
  const dir = useMemo(() => new Vector3(), []);
  const tmpColor = useMemo(() => new Color(), []);

  const geom = useMemo(() => new CylinderGeometry(1, 1, 1, 12, 1, true), []);
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

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const events = useEventStore.getState().events;
    const now = useWorldStore.getState().elapsed * 1000 + performance.timeOrigin;

    let i = 0;
    for (const e of events) {
      if (!e.at || i >= EVENTS.poolSize) continue;
      const map = visualByKind[e.kind];
      if (!map.beam) continue;

      const life = EVENTS.baseLifespanMs * map.lifeMul * (0.6 + e.intensity);
      const age = (now - e.t) / life;
      if (age >= 1) continue;

      const base = geoToVec3(e.at, EARTH_RADIUS);
      dir.copy(base).normalize();

      const height = 0.25 + e.intensity * 0.6;
      const radius = 0.0025 * (0.5 + e.intensity);
      // Place center halfway up the beam.
      dummy.position.copy(dir).multiplyScalar(EARTH_RADIUS + height * 0.5);
      q.setFromUnitVectors(up, dir);
      dummy.quaternion.copy(q);
      const fade = 1 - age;
      dummy.scale.set(radius, height * (0.6 + fade * 0.4), radius);
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

  return (
    <instancedMesh
      ref={meshRef}
      args={[geom, mat, EVENTS.poolSize]}
      frustumCulled={false}
    />
  );
}
