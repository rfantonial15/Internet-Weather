import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useUIStore } from "@/state/useUIStore";

/**
 * Lightweight FPS smoother. Pushes a 30-frame EMA into the UI store so the
 * HUD can display it without touching the render loop on every frame.
 */
export function PerformanceProbe() {
  const acc = useRef({ frames: 0, time: 0 });
  const setFps = useUIStore((s) => s.setFps);

  useFrame((_, dt) => {
    acc.current.frames++;
    acc.current.time += dt;
    if (acc.current.time >= 0.5) {
      const fps = acc.current.frames / acc.current.time;
      setFps(Math.round(fps));
      acc.current.frames = 0;
      acc.current.time = 0;
    }
  });

  return null;
}
