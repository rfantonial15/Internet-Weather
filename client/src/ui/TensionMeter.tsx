import { useWorldStore } from "@/state/useWorldStore";
import { RadialMeter } from "./components/RadialMeter";

/**
 * Right-side radial tension dial (md and up; narrow screens get a one-line
 * readout in the HUD status block instead). The world store only publishes
 * tension at ~5 Hz, so subscribing directly is cheap.
 */
export function TensionMeter() {
  const tension = useWorldStore((s) => s.tension);

  return (
    <div className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 md:block">
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
