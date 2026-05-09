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

interface Props {
  children: ReactNode;
}

/**
 * The single Canvas mount point. All scenes live inside this component so we
 * never trigger context loss / shader recompiles when scenes swap.
 */
export function RenderPipeline({ children }: Props) {
  const quality = useUIStore((s) => s.quality);
  const profile = profiles[quality];

  return (
    <Canvas
      dpr={profile.dpr}
      gl={{
        antialias: false, // bloom + smaa handle edges; saves a fillrate hit
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.outputColorSpace = SRGBColorSpace;
      }}
      camera={{
        fov: CAMERA.baseFov,
        near: 0.05,
        far: 200,
        position: [0, 0.3, CAMERA.initialDistance],
      }}
    >
      <color attach="background" args={["#05070d"]} />
      <fogExp2 attach="fog" args={["#05070d", 0.018]} />

      <CinematicCamera />
      <WorldClock />
      <PerformanceProbe />

      {children}

      <PostFX profile={profile} />
    </Canvas>
  );
}
