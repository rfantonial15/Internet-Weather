import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  InstancedMesh,
  Object3D,
  Color,
  MeshBasicMaterial,
  SphereGeometry,
  AdditiveBlending,
} from "three";
import { useEventStore } from "@/state/useEventStore";
import { visualByKind } from "./eventTypes";
import { eventAge, eventUnit } from "./eventGeo";
import { EARTH_RADIUS, EVENTS } from "@/config/constants";
import { EventBeam } from "./EventBeam";
import { EventRipple } from "./EventRipple";

/**
 * Every located event gets three presentations at once:
 *   - a glowing instanced "ping" on the surface (this component)
 *   - a vertical beam for high-energy kinds (EventBeam)
 *   - an expanding shockwave ring (EventRipple)
 *
 * All three are instanced over the EVENTS.poolSize ring buffer and read the
 * store with getState() inside useFrame, so event traffic never triggers a
 * React re-render.
 */
export function EventMarkers() {
  const meshRef = useRef<InstancedMesh>(null!);
  const dummy = useMemo(() => new Object3D(), []);
  const tmpColor = useMemo(() => new Color(), []);
  const geom = useMemo(() => new SphereGeometry(1, 12, 10), []);
  const mat = useMemo(
    () =>
      new MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
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
      const unit = eventUnit(e);
      if (!unit || i >= EVENTS.poolSize) continue;
      const age = eventAge(e, now);
      if (age < 0 || age >= 1) continue;
      const map = visualByKind[e.kind];

      dummy.position.copy(unit).multiplyScalar(EARTH_RADIUS * 1.005);
      // Quick bloom in, slow fade out.
      const breath = age < 0.1 ? age / 0.1 : 1 - (age - 0.1) / 0.9;
      const s = map.size * (0.6 + e.intensity * 1.2) * (0.7 + breath * 0.5);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tmpColor.set(map.color).multiplyScalar((1.2 + e.intensity) * (0.35 + 0.65 * breath));
      mesh.setColorAt(i, tmpColor);
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[geom, mat, EVENTS.poolSize]} frustumCulled={false} />
      <EventBeam />
      <EventRipple />
    </group>
  );
}
