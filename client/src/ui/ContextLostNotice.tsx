import { useEffect, useState } from "react";
import { useUIStore } from "@/state/useUIStore";

/** Seconds to wait for the browser to restore the context before offering a reload. */
const RELOAD_AFTER_MS = 4000;

/**
 * Shown while the WebGL context is lost. Browsers usually restore it within
 * a moment (three rebuilds GPU state on restore); if not, offer a reload.
 */
export function ContextLostNotice() {
  const lost = useUIStore((s) => s.glLost);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!lost) {
      setStuck(false);
      return;
    }
    const t = window.setTimeout(() => setStuck(true), RELOAD_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [lost]);

  if (!lost) return null;
  return (
    <div role="alert" className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-ink-900/80">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="hud-label hud-label--strong">graphics paused</span>
        <span className="max-w-[32ch] text-[13px] leading-relaxed text-paper-mute">
          The browser reset the 3D view. It usually comes back on its own in a moment.
        </span>
        {stuck && (
          <button
            onClick={() => window.location.reload()}
            className="focus-ring mt-1 border border-paper-faint px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-paper hover:border-accent-dim"
          >
            reload
          </button>
        )}
      </div>
    </div>
  );
}
