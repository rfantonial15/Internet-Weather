import {
  EffectComposer,
  Bloom,
  Vignette,
  SMAA,
} from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import type { QualityProfile } from "@/config/quality";

/**
 * Postprocessing stack — minimal, restrained. Order:
 *
 *   SMAA    → cheap edge AA. MSAA would re-pay the bloom-pass overhead.
 *   Bloom   → the *only* glow source. Threshold is set high enough that only
 *             genuinely bright pixels (sun terminator, lightning, beams,
 *             event ripples) bloom. Surface and atmosphere stay clean.
 *   Vignette → very gentle. Just enough to anchor the planet at the centre
 *              of attention; never enough to crush the image into a tunnel.
 *
 * Removed from the prior pipeline:
 *   - ChromaticAberration: read as visual noise / fringing on UI text and
 *     event markers. The cinematic feel doesn't need lens fringing.
 *   - Noise grain: blended on OVERLAY which interacted unpredictably with
 *     the additive emissive layers, contributing to the milky wash.
 *   - Heavy Bloom kernel size: HUGE on radius 0.85 spreads emission across
 *     a quarter of the screen. LARGE on radius 0.65 keeps glow local.
 */
export function PostFX({ profile }: { profile: QualityProfile }) {
  return (
    <EffectComposer
      multisampling={0}
      stencilBuffer={false}
      // Float buffers are unnecessary for our LDR pipeline and add bandwidth
      // overhead without any visible benefit.
      frameBufferType={undefined}
    >
      <SMAA />
      <Bloom
        intensity={profile.bloomIntensity}
        // Higher threshold = only the brightest pixels bloom. The old value
        // (0.16) caused even mid-tone pixels to feed the bloom, washing
        // everything out.
        luminanceThreshold={0.62}
        luminanceSmoothing={0.32}
        radius={profile.bloomRadius}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.30} darkness={0.55} />
    </EffectComposer>
  );
}
