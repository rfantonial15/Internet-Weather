import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { CameraDirector } from "./cameraDirector";
import { useCameraStore } from "@/state/useCameraStore";

/**
 * Bridges the CameraDirector (pure math) with R3F's camera. The director owns
 * targets; this component reads from useCameraStore to switch between idle &
 * focused modes, and applies the result to the active perspective camera.
 */
export function CinematicCamera() {
  const camera = useThree((s) => s.camera);
  const director = useMemo(() => new CameraDirector(), []);
  const tmp = useRef(new Vector3());

  const release = useCameraStore((s) => s.release);

  useEffect(() => {
    const unsub = useCameraStore.subscribe((s) => {
      if (s.mode === "focus") {
        director.setFocus(s.target, s.distance);
      }
    });
    return unsub;
  }, [director]);

  useFrame((_, dt) => {
    const { mode, focusUntil } = useCameraStore.getState();

    if (mode === "focus" && performance.now() > focusUntil) release();
    if (mode !== "focus") director.setIdle(dt);

    director.step(dt, tmp.current);
    camera.position.copy(tmp.current);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
