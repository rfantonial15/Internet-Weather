import { useFrame } from "@react-three/fiber";
import { activeRecorder } from "./clipRecorder";

/**
 * Copies each rendered frame into the active clip recorder.
 *
 * Priority 2 runs after the EffectComposer (priority 1) has rendered this
 * frame, while the drawing buffer still holds it, so recording works without
 * preserveDrawingBuffer. When nothing is recording this is a single null check.
 */
export function CaptureFrameTap() {
  useFrame(() => {
    activeRecorder()?.drawFrame();
  }, 2);
  return null;
}
