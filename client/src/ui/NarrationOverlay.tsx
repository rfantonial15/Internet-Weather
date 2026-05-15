import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNarrationStore } from "@/state/useNarrationStore";
import type { NarrationTone } from "@iw/shared";

/**
 * Narration caption.
 *
 * Sits in the upper third of the frame as a documentary-style voice-over
 * line. Each narration:
 *   - fades in over 800ms
 *   - holds for 4s + 60ms per character (longer sentences linger)
 *   - fades out over 1.0s
 *
 * Tone influences a quiet right-hand tag, not the colour of the text. The
 * prior implementation tinted rules and added box-shadow glows per tone — it
 * read as a tone-coded UI rather than narration. The film-grade version
 * keeps the body in paper white and lets the words do the work.
 */
const TONE_LABEL: Record<NarrationTone, string> = {
  contemplative: "low signal",
  observational: "nominal",
  concerned: "elevated",
  electric: "spike",
  awed: "anomaly",
  grave: "critical",
};

export function NarrationOverlay() {
  const current = useNarrationStore((s) => s.current);
  const clear = useNarrationStore((s) => s.clearCurrent);
  const [renderedId, setRenderedId] = useState<string | null>(null);

  useEffect(() => {
    if (!current || current.id === renderedId) return;
    setRenderedId(current.id);
    const hold = 4000 + current.text.length * 55;
    const timeout = window.setTimeout(() => {
      if (useNarrationStore.getState().current?.id === current.id) clear();
    }, hold);
    return () => window.clearTimeout(timeout);
  }, [current, renderedId, clear]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[14%] z-20 flex justify-center">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-[min(720px,90vw)] flex-col items-center text-center"
          >
            <Rule />
            <p className="px-6 py-4 font-display text-[15px] font-light leading-relaxed tracking-wide text-paper sm:text-base md:text-[17px]">
              {current.text}
            </p>
            <Rule reverse />

            <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-paper-faint">
              <span>obs</span>
              <span aria-hidden>·</span>
              <span>{TONE_LABEL[current.tone]}</span>
              {current.region && (
                <>
                  <span aria-hidden>·</span>
                  <span>{current.region}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Rule({ reverse = false }: { reverse?: boolean }) {
  // Hairline, paper white, no glow. Letter the rule scale in/out from the
  // appropriate side so the eye gets a quiet "now reading / done reading" cue.
  return (
    <motion.div
      className="h-px w-full bg-paper-ghost"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      exit={{ scaleX: 0 }}
      transition={{ duration: 0.7, delay: reverse ? 0.05 : 0, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: reverse ? "right" : "left" }}
    />
  );
}
