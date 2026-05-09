import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNarrationStore } from "@/state/useNarrationStore";
import type { NarrationTone } from "@iw/shared";

/**
 * Cinematic narration overlay.
 *
 * Sits in the upper-third of the frame — a documentary-style voice-over
 * caption. Each narration:
 *   - fades in over 800ms with a subtle vertical drift
 *   - holds for 4s + 60ms per character (so longer sentences linger)
 *   - fades out over 1.0s
 *   - hands off to the next without a hard cut
 *
 * Tone drives the accent color of the rules above & below the text. The
 * tone-mapping is intentionally narrow — we don't want six radically
 * different overlay looks; just six subtle palette nudges.
 */
const TONE_COLORS: Record<NarrationTone, string> = {
  contemplative: "rgba(150, 200, 255, 0.85)",
  observational: "rgba(207, 230, 255, 0.85)",
  concerned:     "rgba(255, 175, 120, 0.85)",
  electric:      "rgba(92, 243, 255, 0.95)",
  awed:          "rgba(125, 249, 198, 0.85)",
  grave:         "rgba(255, 100, 150, 0.90)",
};

const TONE_LABEL: Record<NarrationTone, string> = {
  contemplative: "obs · low signal",
  observational: "obs · nominal",
  concerned: "obs · elevated",
  electric: "obs · spike",
  awed: "obs · anomaly",
  grave: "obs · critical",
};

export function NarrationOverlay() {
  const current = useNarrationStore((s) => s.current);
  const clear = useNarrationStore((s) => s.clearCurrent);
  const [renderedId, setRenderedId] = useState<string | null>(null);

  // Hold-time scales with text length so the user can finish reading.
  useEffect(() => {
    if (!current || current.id === renderedId) return;
    setRenderedId(current.id);
    const hold = 4000 + current.text.length * 55;
    const timeout = window.setTimeout(() => {
      // Only clear if it's still the same narration — otherwise a newer one
      // already replaced it.
      if (useNarrationStore.getState().current?.id === current.id) clear();
    }, hold);
    return () => window.clearTimeout(timeout);
  }, [current, renderedId, clear]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[14%] flex justify-center">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-[min(720px,90vw)] flex-col items-center text-center"
          >
            <Rule color={TONE_COLORS[current.tone]} />
            <div className="px-4 py-3 font-display text-[15px] font-light leading-relaxed tracking-wide text-[rgba(230,242,255,0.95)] sm:text-base md:text-lg">
              <NarrationText text={current.text} />
            </div>
            <Rule color={TONE_COLORS[current.tone]} reverse />

            <div className="mt-2 flex items-center gap-3 text-[10px]">
              <Dot color={TONE_COLORS[current.tone]} />
              <span
                className="font-mono uppercase tracking-[0.32em]"
                style={{ color: TONE_COLORS[current.tone] }}
              >
                {TONE_LABEL[current.tone]}
              </span>
              {current.region && (
                <span className="font-mono uppercase tracking-[0.32em] text-white/40">
                  · {current.region}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Rule({ color, reverse = false }: { color: string; reverse?: boolean }) {
  return (
    <motion.div
      className="h-px w-full"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      exit={{ scaleX: 0 }}
      transition={{ duration: 0.7, delay: reverse ? 0.05 : 0, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: `linear-gradient(${
          reverse ? "to left" : "to right"
        }, transparent, ${color}, transparent)`,
        boxShadow: `0 0 12px ${color}`,
        transformOrigin: reverse ? "right" : "left",
      }}
    />
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full"
      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
    />
  );
}

/**
 * Letter-by-letter typewriter reveal. ~22ms per char with a small jitter so
 * the cadence doesn't feel mechanical. We intentionally don't animate
 * spaces individually — the eye reads them as part of the previous word.
 */
function NarrationText({ text }: { text: string }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    let i = 0;
    let cancelled = false;
    const step = () => {
      if (cancelled) return;
      i = Math.min(text.length, i + 1);
      setShown(text.slice(0, i));
      if (i < text.length) window.setTimeout(step, 22 + Math.random() * 8);
    };
    step();
    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <span>
      {shown}
      <span
        className="inline-block w-[0.12em] -translate-y-[0.1em] animate-pulse"
        style={{ color: "rgba(255,255,255,0.6)" }}
      >
        ▍
      </span>
    </span>
  );
}
