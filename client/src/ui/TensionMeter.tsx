import { useEffect, useState } from "react";
import { useWorldStore } from "@/state/useWorldStore";
import { RadialMeter } from "./components/RadialMeter";

/**
 * Right-side radial tension dial. Polls the world store at ~10Hz so React
 * re-renders stay decoupled from the 60fps render loop.
 *
 * The Index reading below the dial is decorative ("VAR · 0.42") — it gives
 * the meter a second axis to read against, which is what makes a single
 * dial feel like an instrument rather than a progress bar.
 */
export function TensionMeter() {
  const [tension, setTension] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 100) {
        last = t;
        setTension(useWorldStore.getState().tension);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2">
      <div className="flex flex-col items-center gap-3">
        <RadialMeter value={tension} label="tension" hot />
        <div className="flex flex-col items-center gap-0.5 font-mono text-[10px] tracking-[0.28em] tabular-nums">
          <span className="text-paper-faint uppercase">var</span>
          <span className="text-paper-mute">{tension.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
