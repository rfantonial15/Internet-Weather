import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { EventKind } from "@iw/shared";
import { useUIStore } from "@/state/useUIStore";
import { useHomeStore } from "@/state/useHomeStore";
import { eventColor } from "@/config/colors";
import { CITIES_BY_NAME } from "@/utils/home";
import { Glyph } from "./components/Glyph";

/** What each signal looks like on the globe, and what it stands for. */
const KEY: Array<{ kind: EventKind; looks: string; means: string }> = [
  { kind: "rage", looks: "lightning storms", means: "outrage and pile-ons" },
  { kind: "controversy", looks: "pressure fronts", means: "opinion splitting in two" },
  { kind: "news", looks: "shockwaves", means: "breaking stories" },
  { kind: "viral", looks: "flares", means: "something spreading fast" },
  { kind: "trend", looks: "rising currents", means: "a topic gaining ground" },
  { kind: "meme", looks: "swarms", means: "jokes migrating city to city" },
  { kind: "build", looks: "city lights pulsing", means: "people shipping things" },
  { kind: "wholesome", looks: "aurora", means: "kindness and good news" },
];

/** Opens the guide; sits in the HUD's title column. */
export function FieldGuideButton() {
  const open = useUIStore((s) => s.guideOpen);
  const setOpen = useUIStore((s) => s.setGuideOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-controls="iw-guide"
      className="focus-ring pointer-events-auto -mx-1 w-fit px-1 text-left"
    >
      <span className="hud-label hud-label--faint hover:text-paper">field guide {open ? "▾" : "▸"}</span>
    </button>
  );
}

/**
 * The legend. Rendered above the narration layer so it is never covered on
 * a phone. Esc or the close button shuts it; "?" toggles it from anywhere.
 */
export function FieldGuide() {
  const open = useUIStore((s) => s.guideOpen);
  const setOpen = useUIStore((s) => s.setGuideOpen);
  const connected = useUIStore((s) => s.connected);
  const city = useHomeStore((s) => s.city);
  const setCity = useHomeStore((s) => s.setCity);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
      if (e.key === "?" && !typing) {
        e.preventDefault();
        setOpen(!useUIStore.getState().guideOpen);
      } else if (e.key === "Escape" && useUIStore.getState().guideOpen) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          id="iw-guide"
          aria-label="Field guide"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-4 right-4 top-[calc(7.5rem+env(safe-area-inset-top))] z-30 max-h-[calc(100dvh-14rem)] overflow-y-auto border border-paper-ghost bg-ink-900/90 p-4 backdrop-blur-md sm:left-10 sm:right-auto sm:top-[9rem] sm:w-[340px]"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="hud-label hud-label--strong">field guide</span>
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="focus-ring hud-label hud-label--mute hover:text-paper">
              close
            </button>
          </div>

          <p className="mb-3 font-display text-[13px] leading-snug text-paper-mute">
            The internet, drawn as weather over the real Earth. Each signal lands near a city and
            fades after a few seconds.
          </p>

          <ul className="space-y-2">
            {KEY.map((k) => (
              <li key={k.kind} className="flex items-baseline gap-3">
                <Glyph kind={k.kind} color={eventColor[k.kind]} />
                <span className="w-[86px] shrink-0 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: eventColor[k.kind] }}>
                  {k.kind}
                </span>
                <span className="font-display text-[12.5px] leading-snug text-paper">
                  {k.looks}
                  <span className="text-paper-faint"> · {k.means}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 font-display text-[12.5px] leading-snug text-paper-mute">
            <span className="text-paper">Tension</span> is how stormy the whole planet is right now.
          </p>

          <div className="mt-4 border-t border-paper-ghost pt-3">
            <label htmlFor="iw-guide-city" className="hud-label hud-label--mute">
              your city
            </label>
            <select
              id="iw-guide-city"
              value={city.name}
              onChange={(e) => setCity(e.target.value)}
              className="focus-ring mt-1 block w-full cursor-pointer border border-paper-ghost bg-ink-800 px-2 py-1.5 font-display text-[13px] text-paper"
            >
              {CITIES_BY_NAME.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-1 font-mono text-[10px] leading-relaxed tracking-[0.12em] text-paper-faint">
            <p>drag to turn · scroll or pinch to zoom · double-click to reset</p>
            <p>click a signal to lock on · esc to let go · ? opens this guide</p>
            <p className="pt-1">
              {connected
                ? "signals come from the live server feed."
                : "signals are simulated right now, placed near real cities."}
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
