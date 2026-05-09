import { useFrame } from "@react-three/fiber";
import { useWorldStore } from "@/state/useWorldStore";

/**
 * Pushes the master clock into the world store so non-R3F code (UI, shaders
 * via uniforms, server/idle systems) can sync to it without their own raf.
 */
export function WorldClock() {
  const setElapsed = useWorldStore((s) => s.setElapsed);
  useFrame((state) => {
    setElapsed(state.clock.getElapsedTime());
  });
  return null;
}
