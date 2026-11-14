import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { WeatherEvent } from "@iw/shared";
import { useEventStore } from "@/state/useEventStore";
import { useCameraStore } from "@/state/useCameraStore";
import { eventColor } from "@/config/colors";
import { Glyph } from "./components/Glyph";
import { HoloFrame } from "./components/HoloFrame";

/** Rows shown: six on wider screens, four on phones. */
function useRowCount(): number {
  const query = "(min-width: 640px)";
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide ? 6 : 4;
}

/**
 * Bottom-of-frame signal log: the six most recent events as fixed-width
 * monospace rows (glyph, kind, label, lat/lon, intensity). Each row is a
 * button: pick one and the camera turns to it.
 *
 * Deliberately not an aria-live region: rows arrive several times a second,
 * which would drown a screen reader. The narration line is the live region.
 */
export function EventTicker() {
  const rows = useRowCount();
  // zustand v4 memoizes on the state snapshot, so slicing here is safe.
  const events = useEventStore((s) => s.events.slice(-rows));
  const selectedId = useCameraStore((s) => s.selected?.id ?? null);

  return (
    <HoloFrame className="relative px-3 py-3 sm:px-5" edges>
      <div className="hud-label hud-label--mute mb-2 flex items-center gap-2">
        <span aria-hidden className="h-1 w-1 rounded-full bg-accent-dim" />
        live signals
      </div>
      <ul className="pointer-events-auto relative space-y-[2px]" aria-label="Recent signals">
        {/* popLayout: leaving rows are lifted out of flow so the frame keeps a
            constant height instead of growing while they fade. */}
        <AnimatePresence initial={false} mode="popLayout">
          {events.map((e) => (
            <motion.li
              key={e.id}
              layout="position"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Row e={e} selected={e.id === selectedId} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </HoloFrame>
  );
}

function Row({ e, selected }: { e: WeatherEvent; selected: boolean }) {
  const color = eventColor[e.kind];
  const where = e.at ? `${signed(e.at.lat, 1)}°, ${signed(e.at.lon, 1)}°` : "global";
  return (
    <button
      type="button"
      disabled={!e.at}
      onClick={() => useCameraStore.getState().select(e)}
      aria-label={`${e.kind}: ${e.label ?? "unlabelled"}, ${where}, intensity ${Math.round(e.intensity * 100)}. Show on globe.`}
      className={`focus-ring flex w-full items-center gap-2 px-1 py-[3px] text-left font-mono text-[11px] tabular-nums tracking-wide transition-colors sm:gap-3 ${
        selected ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
      }`}
    >
      <Glyph kind={e.kind} color={color} />
      <span
        className="w-[84px] shrink-0 uppercase tracking-[0.08em] sm:w-[112px] sm:tracking-[0.2em]"
        style={{ color, opacity: 0.85 }}
      >
        {e.kind}
      </span>
      <span className="min-w-0 flex-1 truncate text-white/95">{e.label ?? "unlabelled"}</span>
      <span className="hidden w-[140px] shrink-0 text-right text-white/65 sm:inline">{where}</span>
      <span className="w-7 shrink-0 text-right text-white/80">
        {String(Math.round(e.intensity * 100)).padStart(2, "0")}
      </span>
    </button>
  );
}

function signed(n: number, p: number): string {
  const s = n.toFixed(p);
  return n >= 0 ? `+${s}` : s;
}
