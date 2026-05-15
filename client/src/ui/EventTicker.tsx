import { AnimatePresence, motion } from "framer-motion";
import { useEventStore } from "@/state/useEventStore";
import { eventColor } from "@/config/colors";
import { Glyph } from "./components/Glyph";
import { HoloFrame } from "./components/HoloFrame";

/**
 * Bottom-of-frame signal log.
 *
 * Six most recent events as monospace lines. Glyph + kind + label + lat/lon
 * + intensity, fixed-width columns so the eye reads it as a tabular log
 * rather than a wall of text. No background panel — the HoloFrame corners
 * delineate the region without claiming the space.
 */
export function EventTicker() {
  const events = useEventStore((s) => s.events.slice(-6));

  return (
    <HoloFrame className="relative px-5 py-3" edges>
      <div className="hud-label hud-label--mute mb-2 flex items-center gap-2">
        {/* Static dot. No animate-pulse — the ticker animates per-row entry,
            which is plenty of motion. A pulsing header is hacker-UI. */}
        <span className="h-1 w-1 rounded-full bg-accent-dim" />
        live signals
      </div>
      <ul className="space-y-[3px]">
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 font-mono text-[11px] tabular-nums tracking-wide"
            >
              <Glyph kind={e.kind} color={eventColor[e.kind]} />
              <span
                className="w-[78px] uppercase tracking-[0.24em]"
                style={{ color: eventColor[e.kind], opacity: 0.85 }}
              >
                {e.kind}
              </span>
              <span className="w-40 truncate text-white/95">{e.label ?? "—"}</span>
              <span className="ml-auto w-[150px] text-right text-white/65">
                {e.at
                  ? `${signed(e.at.lat, 1)}°, ${signed(e.at.lon, 1)}°`
                  : "global"}
              </span>
              <span className="w-9 text-right text-white/80">
                {String(Math.round(e.intensity * 100)).padStart(2, "0")}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </HoloFrame>
  );
}

function signed(n: number, p: number): string {
  const s = n.toFixed(p);
  return n >= 0 ? `+${s}` : s;
}
