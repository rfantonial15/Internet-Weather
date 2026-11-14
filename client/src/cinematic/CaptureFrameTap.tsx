import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { activeRecorder, registerRenderControl } from "./clipRecorder";

/**
 * Copies each rendered frame into the active clip recorder, and lends the
 * recorder control of the pixel ratio so a recording can render sharper than
 * the live view (a 9:16 crop of a 16:9 screen is otherwise very small).
 *
 * Priority 2 runs after the EffectComposer (priority 1) has rendered this
 * frame, while the drawing buffer still holds it, so recording works without
 * preserveDrawingBuffer. When nothing is recording this is a single null check.
 */
export function CaptureFrameTap() {
  const get = useThree((s) => s.get);

  useEffect(() => {
    registerRenderControl({
      cssSize: () => {
        const { width, height } = get().size;
        return { width, height };
      },
      dpr: () => get().viewport.dpr,
      setDpr: (d) => get().setDpr(d),
    });
    return () => registerRenderControl(null);
  }, [get]);

  useFrame(() => {
    activeRecorder()?.drawFrame();
  }, 2);
  return null;
}
