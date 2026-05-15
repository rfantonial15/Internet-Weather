import { Suspense, useEffect } from "react";
import { RenderPipeline } from "@/core/engine/RenderPipeline";
import { WorldScene } from "@/scenes/WorldScene";
import { HUD } from "@/ui/HUD";
import { NarrationOverlay } from "@/ui/NarrationOverlay";
import { BootSequence } from "@/ui/BootSequence";
import { CinematicOverlay } from "@/ui/CinematicOverlay";
import { ClipGallery } from "@/ui/ClipGallery";
import { useRealtime } from "@/hooks/useRealtime";
import { useUIStore } from "@/state/useUIStore";
import { initCaptureDirector } from "@/cinematic/captureDirector";
import { getSourceCanvas } from "@/cinematic/sourceCanvas";

/**
 * Application root + z-layer plan. Each row owns a single ordering tier so
 * components don't reach into each other's layout space:
 *
 *   z-0   canvas (3D)
 *   z-0   ambient hud-grid (background graphic, never interactive)
 *   z-10  primary HUD (chrome + readouts)
 *   z-20  narration overlay (mid-frame caption)
 *   z-20  clip gallery toggle button
 *   z-30  cinematic overlay (letterbox + title; only mounted while active)
 *   z-40  clip gallery drawer (modal-ish surface)
 *   z-50  boot sequence (cold-start veil)
 *
 * The radial vignette is rendered in PostFX, not as a CSS overlay — having
 * both was responsible for a chunk of the "muddy" feel.
 */
export default function App() {
  useRealtime();
  const booted = useUIStore((s) => s.booted);
  const finishBoot = useUIStore((s) => s.finishBoot);

  useEffect(() => {
    const t = window.setTimeout(finishBoot, 3200);
    return () => window.clearTimeout(t);
  }, [finishBoot]);

  // Boot the cinematic capture system once the boot sequence is done. The
  // canvas registration happens during RenderPipeline.onCreated, so by the
  // time the boot timer fires the source is guaranteed to be live.
  useEffect(() => {
    if (!booted) return;
    const handle = initCaptureDirector(getSourceCanvas);
    return () => handle.dispose();
  }, [booted]);

  return (
    <div className="relative h-full w-full bg-ink-900">
      <RenderPipeline>
        <Suspense fallback={null}>
          <WorldScene />
        </Suspense>
      </RenderPipeline>

      {/* Ambient hud grid — very faint, masked toward the centre. Sits below
          the HUD but above the canvas, so it reads as an optical filter. */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 hud-grid opacity-[0.10]" />
      </div>

      <HUD />
      <NarrationOverlay />
      <CinematicOverlay />
      <ClipGallery />
      {!booted && <BootSequence />}
    </div>
  );
}
