import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
  SMAA,
} from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";
import { Vector2 } from "three";
import type { QualityProfile } from "@/config/quality";

/**
 * Postprocessing stack. Order matters:
 *   SMAA   → cheap edge AA (cheaper than MSAA on bloom-heavy scenes)
 *   Bloom  → defines the cinematic glow that drives the whole aesthetic
 *   CA     → very subtle lens fringing, edge-only via radial modulation
 *   Noise  → film grain. Tiny opacity, OVERLAY blend → reads as celluloid,
 *            never as static. Hides banding in the bloom + atmosphere mix.
 *   Vignette → finishes the frame, focuses the eye on the planet
 *
 * All effects respect the active quality profile so a low-tier device drops
 * intensity rather than disabling effects (which would change the "look").
 */
export function PostFX({ profile }: { profile: QualityProfile }) {
  return (
    <EffectComposer multisampling={0} stencilBuffer={false}>
      <SMAA />
      <Bloom
        intensity={profile.bloomIntensity}
        luminanceThreshold={0.16}
        luminanceSmoothing={0.55}
        radius={profile.bloomRadius}
        kernelSize={KernelSize.HUGE}
        mipmapBlur
      />
      <ChromaticAberration
        offset={new Vector2(0.0007, 0.0011)}
        radialModulation={true}
        modulationOffset={0.42}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise
        opacity={0.045}
        premultiply
        blendFunction={BlendFunction.OVERLAY}
      />
      <Vignette eskil={false} offset={0.22} darkness={0.92} />
    </EffectComposer>
  );
}
