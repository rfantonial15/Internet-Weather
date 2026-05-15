import { AnimatePresence, motion } from "framer-motion";
import { useCameraStore } from "@/state/useCameraStore";

/**
 * Floating coord readout — appears beside the reticle only when the camera
 * is in focus mode. Mirrors the "object lock" UI pattern from sci-fi
 * tracking displays: when there's a target, give it a label.
 */
export function CoordReadout() {
  const mode = useCameraStore((s) => s.mode);
  const geo = useCameraStore((s) => s.targetGeo);

  return (
    <div className="absolute left-1/2 top-1/2 -translate-y-1/2 translate-x-[180px]">
      <AnimatePresence>
        {mode === "focus" && geo && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-1 font-mono text-[10px] tracking-[0.32em]"
          >
            <span className="hud-label hud-label--mute">target</span>
            <span className="text-paper tabular-nums">
              {geo.lat >= 0 ? "+" : ""}
              {geo.lat.toFixed(2)}°
            </span>
            <span className="text-paper-mute tabular-nums">
              {geo.lon >= 0 ? "+" : ""}
              {geo.lon.toFixed(2)}°
            </span>
            <span className="hud-label hud-label--faint">lock · active</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
