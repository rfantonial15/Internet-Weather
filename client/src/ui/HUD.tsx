import { motion } from "framer-motion";
import { useUIStore } from "@/state/useUIStore";
import { EventTicker } from "./EventTicker";
import { Reticle } from "./Reticle";
import { TensionMeter } from "./TensionMeter";
import { Chrono } from "./components/Chrono";
import { CoordReadout } from "./components/CoordReadout";

/**
 * The HUD layer. Layout principles:
 *
 *   - Reserved zones, never panels. Identity top-left, chrono top-right,
 *     reticle dead-center, dial right-middle, ticker bottom — and that's
 *     it. The center stays uncluttered so the planet has room.
 *
 *   - One unit of motion at a time. The radar sweep is the only fast-moving
 *     element; everything else animates only on entry/exit. The eye stays
 *     on the planet, the chrome stays still.
 *
 *   - No backgrounds. Rules and corner marks delineate; never panels.
 *     Panels suggest a dashboard. We are not a dashboard.
 *
 *   - Restraint over information. Every readout earns its place. If a value
 *     can be inferred from the visualization, it doesn't appear in the HUD.
 */
export function HUD() {
  const fps = useUIStore((s) => s.fps);
  const connected = useUIStore((s) => s.connected);
  const quality = useUIStore((s) => s.quality);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 2.6 }}
    >
      {/* Faint frame rules — top + bottom only, edges fade into transparency */}
      <FrameRules />

      {/* Top-left: identity + observation mode */}
      <div className="absolute left-10 top-7 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-cyan shadow-[0_0_8px_rgba(92,243,255,0.9)]" />
          <span className="hud-label">Internet Weather</span>
        </div>
        <span className="hud-label opacity-45">obs · planetary uplink</span>
        <span className="hud-label opacity-30">spec · v.0.1.0</span>
      </div>

      {/* Top-right: chrono + status */}
      <div className="absolute right-10 top-7 flex flex-col items-end gap-2">
        <Chrono />
        <div className="flex flex-col items-end gap-1">
          <span className="hud-label opacity-65">
            {connected ? "uplink · stable" : "uplink · simulated"}
          </span>
          <span className="hud-label opacity-30">
            q.{quality} · {String(fps).padStart(2, "0")}fps
          </span>
        </div>
      </div>

      <Reticle />
      <CoordReadout />
      <TensionMeter />

      {/* Bottom: signal log */}
      <div className="absolute inset-x-0 bottom-0 px-10 pb-7">
        <div className="mx-auto max-w-[640px]">
          <EventTicker />
        </div>
      </div>
    </motion.div>
  );
}

function FrameRules() {
  const grad =
    "linear-gradient(to right, transparent 0%, rgba(120,200,255,0.18) 30%, rgba(120,200,255,0.18) 70%, transparent 100%)";
  return (
    <>
      <span aria-hidden className="absolute left-10 right-10 top-4 h-px" style={{ background: grad }} />
      <span aria-hidden className="absolute left-10 right-10 bottom-4 h-px" style={{ background: grad }} />
    </>
  );
}
