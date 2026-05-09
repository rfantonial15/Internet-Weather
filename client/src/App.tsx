import { Suspense, useEffect } from "react";
import { RenderPipeline } from "@/core/engine/RenderPipeline";
import { WorldScene } from "@/scenes/WorldScene";
import { HUD } from "@/ui/HUD";
import { NarrationOverlay } from "@/ui/NarrationOverlay";
import { BootSequence } from "@/ui/BootSequence";
import { useRealtime } from "@/hooks/useRealtime";
import { useUIStore } from "@/state/useUIStore";

export default function App() {
  useRealtime();
  const booted = useUIStore((s) => s.booted);
  const finishBoot = useUIStore((s) => s.finishBoot);

  useEffect(() => {
    const t = window.setTimeout(finishBoot, 3200);
    return () => window.clearTimeout(t);
  }, [finishBoot]);

  return (
    <div className="relative h-full w-full bg-ink-900 scanline">
      <RenderPipeline>
        <Suspense fallback={null}>
          <WorldScene />
        </Suspense>
      </RenderPipeline>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 hud-grid opacity-[0.15]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      </div>

      <HUD />
      <NarrationOverlay />
      {!booted && <BootSequence />}
    </div>
  );
}
