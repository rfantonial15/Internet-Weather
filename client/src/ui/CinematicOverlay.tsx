import { AnimatePresence, motion } from "framer-motion";
import { useCinematicStore } from "@/state/useCinematicStore";
import { SHOT_SCHEDULE } from "@/cinematic/cameraChoreography";

/**
 * On-screen mirror of the cinematic shot in progress.
 *
 * Tone: documentary card, not movie poster. Title in restrained sans white,
 * eyebrow in paper-mute mono, no coloured rules, no animated colour swipes.
 * Letterbox bars stay subtle so the HUD beneath remains legible — we want
 * "the frame is widening" rather than "the screen has been blacked out."
 *
 * The previous version baked the per-kind accent colour into the title card
 * (rule above + animated swipe below). That looked like a movie trailer; the
 * brief is documentary.
 *
 * The REC indicator stays in its own corner. A solid (not pulsing) dot — the
 * earlier ping-pulse read as alarm UI rather than instrument state.
 */
export function CinematicOverlay() {
  const active = useCinematicStore((s) => s.active);
  const title = useCinematicStore((s) => s.title);
  const progress = useCinematicStore((s) => s.progress);
  const phase = useCinematicStore((s) => s.phase);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none">
      <AnimatePresence>{active && <Letterbox key="lb" />}</AnimatePresence>

      <AnimatePresence>
        {active && title && (
          <TitleCard
            key={title.title}
            title={title.title}
            eyebrow={title.eyebrow}
            subtitle={title.subtitle}
            progress={progress}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && <RecPill key="rec" phase={phase} />}
      </AnimatePresence>
    </div>
  );
}

function Letterbox() {
  return (
    <>
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: "7%" }}
        exit={{ height: 0 }}
        transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
        className="absolute left-0 right-0 top-0 bg-black/65"
      />
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: "7%" }}
        exit={{ height: 0 }}
        transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
        className="absolute bottom-0 left-0 right-0 bg-black/65"
      />
    </>
  );
}

interface TitleCardProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  progress: number;
}

function TitleCard({ eyebrow, title, subtitle, progress }: TitleCardProps) {
  const inU = SHOT_SCHEDULE.titleInU;
  const outU = SHOT_SCHEDULE.titleOutU;
  const visible = progress >= inU - 0.04 && progress <= outU + 0.10;
  const cardAlpha = !visible
    ? 0
    : progress < inU
    ? Math.max(0, (progress - (inU - 0.04)) / 0.04)
    : progress < outU
    ? 1
    : Math.max(0, 1 - (progress - outU) / 0.10);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: cardAlpha }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-x-0 flex flex-col items-center px-6"
      style={{ top: "60%" }}
    >
      <span className="block h-px w-10 bg-paper-faint" />
      <span
        className="mt-3 font-mono text-[10px] uppercase tracking-[0.32em] text-paper-mute"
      >
        {eyebrow}
      </span>
      <h1
        className="mt-4 max-w-[20ch] text-balance text-center font-display font-light uppercase tracking-[0.08em] text-paper"
        style={{
          fontSize: "clamp(24px, 3.6vw, 48px)",
          lineHeight: 1.08,
          // Keep a single soft drop so the title remains readable against the
          // brightest planet shots, but well below the prior "trailer" bloom.
          textShadow: "0 1px 14px rgba(0,0,0,0.55)",
        }}
      >
        {title}
      </h1>
      <span
        className="mt-3 font-display italic text-paper-mute"
        style={{ fontSize: "clamp(12px, 1.2vw, 16px)" }}
      >
        {subtitle}
      </span>
      <span className="mt-4 block h-px w-10 bg-paper-faint" />
    </motion.div>
  );
}

function RecPill({ phase }: { phase: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3 }}
      className="absolute right-10 top-7 flex items-center gap-2 border border-paper-ghost bg-black/55 px-3 py-1.5"
    >
      {/* Solid dot, no pulse animation. Captures the "recording" state without
          the alarm-UI ping. */}
      <span className="h-1.5 w-1.5 rounded-full bg-[rgba(255,140,140,0.92)]" />
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-paper">
        rec · {phase}
      </span>
    </motion.div>
  );
}
