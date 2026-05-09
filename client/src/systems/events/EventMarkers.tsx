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
import { useCameraStore } from "@/state/useCameraStore";
import { useWorldStore } from "@/state/useWorldStore";
import { visualByKind } from "./eventTypes";
import { geoToVec3 } from "@/utils/geo";
import { EARTH_RADIUS, EVENTS } from "@/config/constants";
import { EventBeam } from "./EventBeam";
import { EventRipple } from "./EventRipple";

/**
 * Pulls events from the store and presents them three ways simultaneously:
 *   - a glowing instanced sphere stuck to the surface (the "ping")
 *   - a vertical beam (for high-energy kinds)
 *   - an expanding shockwave ripple
 *
 * Instancing keeps the cost flat across the EVENTS.poolSize ring buffer.
 */
export function EventMarkers() {
  const meshRef = useRef<InstancedMesh>(null!);
  const dummy = useMemo(() => new Object3D(), []);
  const tmpColor = useMemo(() => new Color(), []);

  const events = useEventStore((s) => s.events);
  const focusOn = useCameraStore((s) => s.focusOn);

  // Auto-focus the camera on the most recent high-intensity event.
  useEffect(() => {
    if (!events.length) return;
    const last = events[events.length - 1];
    if (last.at && last.intensity > 0.7) {
      focusOn(last.at, { distance: 2.2 });
    }
  }, [events, focusOn]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = useWorldStore.getState().elapsed * 1000 + performance.timeOrigin;

    let i = 0;
    for (const e of events) {
      if (!e.at || i >= EVENTS.poolSize) continue;
      const map = visualByKind[e.kind];
      const life = EVENTS.baseLifespanMs * map.lifeMul * (0.6 + e.intensity);
      const age = (now - e.t) / life;
      if (age >= 1) continue;

      const pos = geoToVec3(e.at, EARTH_RADIUS * 1.005);
      dummy.position.copy(pos);
      dummy.lookAt(0, 0, 0);
      // Pulse: quick bloom in, slow fade out.
      const breath = age < 0.1
        ? age / 0.1
        : 1 - (age - 0.1) / 0.9;
      const s = map.size * (0.6 + e.intensity * 1.2) * (0.7 + breath * 0.5);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tmpColor.set(map.color).multiplyScalar(1.4 + e.intensity);
      mesh.setColorAt(i, tmpColor);
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const geom = useMemo(() => new SphereGeometry(1, 12, 12), []);
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

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[geom, mat, EVENTS.poolSize]}
        frustumCulled={false}
      />
      <EventBeam events={events} />
      <EventRipple events={events} />
    </group>
  );
}
