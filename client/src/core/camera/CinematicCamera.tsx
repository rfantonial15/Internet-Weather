import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { CameraDirector } from "./cameraDirector";
import { useCameraStore, registerDirector } from "@/state/useCameraStore";

/**
 * Bridges the CameraDirector (pure math) with R3F's camera. The director owns
 * targets; this component reads from useCameraStore to switch between idle,
 * focused, and shot (cinematic) modes, and applies the result — including
 * dynamic FOV for dolly-zooms — to the active perspective camera.
 */
export function CinematicCamera() {
  const camera = useThree((s) => s.camera);
  const director = useMemo(() => new CameraDirector(), []);
  const tmp = useRef(new Vector3());

  const release = useCameraStore((s) => s.release);

  // Capture director needs imperative access to start shots; we register the
  // instance on mount and clear it on unmount. Avoids prop-drilling through
  // every subsystem that wants to trigger a cinematic move.
  useEffect(() => {
    registerDirector(director);
    return () => registerDirector(null);
  }, [director]);

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

    // A cinematic shot fully owns the camera until it finishes. Idle/focus
    // bookkeeping resumes only when no shot is active.
    if (!director.hasActiveShot()) {
      if (mode === "focus" && performance.now() > focusUntil) release();
      if (mode !== "focus") director.setIdle(dt);
    }

    director.step(dt, tmp.current);
    camera.position.copy(tmp.current);
    camera.lookAt(0, 0, 0);

    if (camera instanceof PerspectiveCamera) {
      const desired = director.fov;
      // Skip work for sub-degree changes — projection matrix updates are not free.
      if (Math.abs(camera.fov - desired) > 0.05) {
        camera.fov = desired;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
