import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { ReactNode } from "react";
import { profiles } from "@/config/quality";
import { useUIStore } from "@/state/useUIStore";
import { CAMERA } from "@/config/constants";
import { PostFX } from "./PostFX";
import { CinematicCamera } from "@/core/camera/CinematicCamera";
import { PerformanceProbe } from "./PerformanceMonitor";
import { WorldClock } from "@/core/time/Clock";
import { registerSourceCanvas } from "@/cinematic/sourceCanvas";

interface Props {
  children: ReactNode;
}

/**
 * The single Canvas mount point. Owns:
 *
 *   - WebGL context configuration (color management, tone mapping, AA strategy)
 *   - Adaptive DPR clamped per quality tier (capped well below 2× to keep
 *     post-processing within fillrate budget on integrated GPUs)
 *   - Resize handling — R3F manages it natively, but we clamp the DPR ceiling
 *     against the live screen width so window resizes don't quietly push us
 *     past a comfortable pixel budget
 *
 * Notes on the gl options:
 *   - antialias is OFF on the WebGL context; we rely on SMAA in PostFX. MSAA
 *     plus multi-pass bloom is wasteful — SMAA edges are visually equivalent
 *     and a fraction of the cost.
 *   - preserveDrawingBuffer stays OFF. Recording uses canvas.captureStream(),
 *     which samples the canvas natively without forcing the framebuffer to
 *     persist on the JS side.
 */
export function RenderPipeline({ children }: Props) {
  const quality = useUIStore((s) => s.quality);
  const profile = profiles[quality];

  return (
    <Canvas
      // Key the Canvas on the quality tier so a downgrade re-creates the
      // context with new DPR bounds — far cleaner than mutating it in place.
      key={quality}
      dpr={profile.dpr}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true,
        // Off — frees a sizable cost on integrated GPUs. The clip recorder
        // uses canvas.captureStream() instead of drawImage compositing.
        preserveDrawingBuffer: false,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        // 1.0 is calibrated. Above ~1.05 the bloom-fed highlights crush
        // mid-tones and the planet looks washed out.
        gl.toneMappingExposure = 1.0;
        gl.outputColorSpace = SRGBColorSpace;
        // Hard upper bound regardless of DPR setting. Some users on retina
        // displays at 2.0× experience steep cost with diminishing returns.
        gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.dpr[1]));
        registerSourceCanvas(gl.domElement);
      }}
      camera={{
        fov: CAMERA.baseFov,
        near: 0.05,
        far: 200,
        position: [0, 0.3, CAMERA.initialDistance],
      }}
      style={{
        // Lock the canvas to the viewport box. Any layout shift is the HUD's
        // problem to handle — the renderer should never resize itself off-axis.
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    >
      <color attach="background" args={["#04060c"]} />

      <CinematicCamera />
      <WorldClock />
      <PerformanceProbe />

      {children}

      <PostFX profile={profile} />
    </Canvas>
  );
}
