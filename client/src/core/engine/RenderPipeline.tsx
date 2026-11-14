import { Canvas } from "@react-three/fiber";
import { NoToneMapping, SRGBColorSpace } from "three";
import { ReactNode } from "react";
import { profiles } from "@/config/quality";
import { useUIStore } from "@/state/useUIStore";
import { CAMERA } from "@/config/constants";
import { PostFX } from "./PostFX";
import { CinematicCamera } from "@/core/camera/CinematicCamera";
import { PerformanceProbe } from "./PerformanceMonitor";
import { WorldClock } from "@/core/time/Clock";
import { registerSourceCanvas } from "@/cinematic/sourceCanvas";
import { CaptureFrameTap } from "@/cinematic/CaptureFrameTap";

interface Props {
  children: ReactNode;
}

/**
 * The single Canvas mount point. Owns the WebGL context configuration and
 * the per-tier DPR range.
 *
 * Quality changes update `dpr` in place; R3F reconfigures the renderer and
 * systems rebuild only the geometry that depends on the tier. (An earlier
 * version keyed the Canvas on the tier, which tore down the whole WebGL
 * context, camera, clock and every GPU resource on each adaptive step.)
 *
 * gl options:
 *   - antialias off: SMAA in PostFX is cheaper than MSAA under multi-pass bloom
 *   - preserveDrawingBuffer off: the clip recorder copies frames inside the
 *     render loop (CaptureFrameTap) instead of forcing the buffer to persist
 *   - no renderer tone mapping: the scene renders into the composer's buffer,
 *     where three never applies it anyway. The palette is graded for a
 *     straight linear-to-sRGB output, which the composer's final pass does
 */
export function RenderPipeline({ children }: Props) {
  const quality = useUIStore((s) => s.quality);
  const profile = profiles[quality];

  return (
    <Canvas
      dpr={profile.dpr}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true,
        preserveDrawingBuffer: false,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = NoToneMapping;
        gl.outputColorSpace = SRGBColorSpace;
        registerSourceCanvas(gl.domElement);
        // three calls preventDefault on loss and rebuilds GPU state on
        // restore; we only surface the state so the UI can explain it.
        const ui = useUIStore.getState();
        gl.domElement.addEventListener("webglcontextlost", () => {
          console.warn("[render] WebGL context lost");
          ui.setGlLost(true);
        });
        gl.domElement.addEventListener("webglcontextrestored", () => {
          console.info("[render] WebGL context restored");
          ui.setGlLost(false);
        });
      }}
      camera={{
        fov: CAMERA.baseFov,
        near: 0.05,
        far: 200,
        position: [0, 0.3, CAMERA.initialDistance],
      }}
      aria-label="Interactive globe. Drag to orbit, scroll or pinch to zoom, click a signal to inspect it."
      role="img"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        touchAction: "none",
      }}
    >
      <color attach="background" args={["#04060c"]} />

      <CinematicCamera />
      <WorldClock />
      <PerformanceProbe />

      {children}

      <PostFX profile={profile} />
      <CaptureFrameTap />
    </Canvas>
  );
}
