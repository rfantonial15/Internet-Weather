import { motion } from "framer-motion";

/**
 * Cold-start veil: cinematic boot screen that fades the planet up. Three
 * stacked layers (block, lines, tagline) animate in/out on a coordinated
 * timeline so the reveal feels orchestrated, not sequential.
 */
export function BootSequence() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-ink-900"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.4, delay: 2.0, ease: "easeInOut" }}
    >
      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          className="h-px w-32 bg-signal-cyan"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="font-display text-3xl font-light tracking-[0.4em] text-signal-cyan">
            INTERNET
          </div>
          <div className="font-display text-3xl font-light tracking-[0.4em] text-signal-magenta">
            WEATHER
          </div>
        </motion.div>

        <motion.div
          className="hud-label opacity-70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          calibrating planetary uplink…
        </motion.div>

        {/* Indeterminate progress bar */}
        <div className="relative h-px w-64 overflow-hidden bg-signal-cyan/15">
          <motion.div
            className="absolute inset-y-0 w-1/3 bg-signal-cyan"
            initial={{ x: "-100%" }}
            animate={{ x: "300%" }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
