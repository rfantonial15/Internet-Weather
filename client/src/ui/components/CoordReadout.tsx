import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useCameraStore } from "@/state/useCameraStore";
import { eventColor } from "@/config/colors";
import { placeLabel } from "@/utils/places";
import { Glyph } from "./Glyph";

/**
 * Target readout. Appears beside the reticle (below it on narrow screens)
 * when the camera locks onto something:
 *   - a picked event: kind, label, nearest city, coordinates, intensity, age
 *   - a picked spot on the globe: nearest city and coordinates
 * Esc (or waiting) releases the lock.
 */
export function CoordReadout() {
  const mode = useCameraStore((s) => s.mode);
  const geo = useCameraStore((s) => s.targetGeo);
  const selected = useCameraStore((s) => s.selected);
  const visible = mode === "focus" && geo !== null;

  return (
    <div className="absolute bottom-[calc(15.5rem+env(safe-area-inset-bottom))] left-1/2 w-[min(320px,calc(100vw-2rem))] -translate-x-1/2 md:bottom-auto md:top-[var(--globe-y,45%)] md:w-[240px] md:-translate-y-1/2 md:translate-x-[190px]">
      <AnimatePresence>
        {visible && geo && (
          <motion.div
            key={selected?.id ?? `${geo.lat.toFixed(2)},${geo.lon.toFixed(2)}`}
            role="status"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-1 border-l border-paper-ghost bg-black/55 py-1.5 pl-3 pr-2 font-mono text-[10px] tracking-[0.24em] md:bg-transparent md:py-1"
          >
            <span className="hud-label hud-label--mute">{selected ? "signal lock" : "target"}</span>
            {selected && (
              <>
                <span className="flex items-center gap-2 uppercase" style={{ color: eventColor[selected.kind] }}>
                  <Glyph kind={selected.kind} color={eventColor[selected.kind]} />
                  {selected.kind}
                  <span className="text-paper-faint">· {Math.round(selected.intensity * 100)}</span>
                </span>
                {selected.label && (
                  <span className="font-display text-[13px] normal-case tracking-normal text-paper">
                    {selected.label}
                  </span>
                )}
              </>
            )}
            <span className="text-paper-mute">{placeLabel(geo)}</span>
            <span className="text-paper tabular-nums">
              {fmt(geo.lat, "N", "S")} {fmt(geo.lon, "E", "W")}
            </span>
            {selected && <Age t={selected.t} source={selected.source} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Age({ t, source }: { t: number; source: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const s = Math.max(0, Math.round((now - t) / 1000));
  return (
    <span className="hud-label hud-label--faint">
      {s}s ago · src {source}
    </span>
  );
}

function fmt(v: number, pos: string, neg: string): string {
  return `${Math.abs(v).toFixed(2)}°${v >= 0 ? pos : neg}`;
}
