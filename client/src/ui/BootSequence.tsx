import { motion } from "framer-motion";

/**
 * Cold-start veil. Monochrome paper-on-ink, single hairline rule.
 *
 * The prior version split the wordmark across cyan + magenta — that's the
 * 2010s hacker-neon cliché. The film-grade version stays on a single weight
 * of paper: title in restrained sans, single accent rule, indeterminate
 * progress as a near-invisible scan. Reads as instrument cold-start, not
 * gaming launcher.
 */
export function BootSequence() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-ink-900"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.4, delay: 2.0, ease: "easeInOut" }}
    >
      <div className="relative flex flex-col items-center gap-7">
        <motion.div
          className="h-px w-24 bg-accent-dim"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
        />

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25 }}
        >
          <div className="font-display text-[30px] font-extralight tracking-[0.46em] text-paper">
            INTERNET&nbsp;WEATHER
          </div>
        </motion.div>

        <motion.div
          className="font-mono text-[10px] uppercase tracking-[0.32em] text-paper-mute"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.85 }}
        >
          calibrating planetary uplink
        </motion.div>

        {/* Indeterminate scan. Very thin, very low contrast — reads as a
            measurement passing across, not as a progress bar. */}
        <div className="relative h-px w-56 overflow-hidden bg-paper-ghost">
          <motion.div
            className="absolute inset-y-0 w-1/3 bg-accent-dim"
            initial={{ x: "-110%" }}
            animate={{ x: "320%" }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
