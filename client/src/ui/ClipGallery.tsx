import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ASPECT_PRESETS,
  type AspectKey,
  type ClipRecord,
  useCinematicStore,
} from "@/state/useCinematicStore";
import { clipFilename, getCaptureDirector } from "@/cinematic/captureDirector";
import { downloadBlobUrl, extensionFor, pickMime } from "@/cinematic/clipRecorder";

/**
 * Drawer for the clips the capture director has produced.
 *
 *   - Toggle button bottom-right; Esc or "close" dismisses the drawer.
 *   - Hard-edged panel in keeping with the HUD ("documents over dashboards").
 *   - Each clip shows its real recorded size and format, previews on hover,
 *     focus or tap, and downloads straight from its blob URL.
 */
export function ClipGallery() {
  const open = useCinematicStore((s) => s.galleryOpen);
  const setOpen = useCinematicStore((s) => s.setGalleryOpen);
  const clips = useCinematicStore((s) => s.clips);
  const auto = useCinematicStore((s) => s.autoCapture);
  const setAuto = useCinematicStore((s) => s.setAutoCapture);
  const preferred = useCinematicStore((s) => s.preferredAspect);
  const setPreferred = useCinematicStore((s) => s.setPreferredAspect);
  const active = useCinematicStore((s) => s.active);
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const supported = useState(() => pickMime() !== null)[0];

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      <ToggleButton open={open} onClick={() => setOpen(!open)} count={clips.length} active={active} />
      <AnimatePresence>
        {open && (
          <motion.aside
            role="dialog"
            aria-label="Clip reel"
            initial={reduce ? { opacity: 0 } : { x: "100%", opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: "100%", opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.65, 0, 0.35, 1] }}
            className="pointer-events-auto absolute right-0 top-0 z-40 flex h-full w-full flex-col border-l border-white/10 bg-black/80 sm:w-[360px]"
          >
            <header className="flex items-center justify-between border-b border-paper-ghost px-5 py-4">
              <div className="flex flex-col gap-0.5">
                <span className="hud-label hud-label--mute">cinematic capture</span>
                <span className="font-display text-[15px] font-light tracking-wide text-paper">
                  trailer reel
                </span>
              </div>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                className="focus-ring px-2 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-paper-mute hover:text-paper"
              >
                close
              </button>
            </header>

            <div className="flex flex-col gap-3 border-b border-paper-ghost px-5 py-4">
              {supported ? (
                <>
                  <ToggleRow label="auto-capture" value={auto} onChange={setAuto} />
                  <AspectRow value={preferred} onChange={setPreferred} />
                  <CaptureNowButton />
                </>
              ) : (
                <p className="text-[12px] leading-relaxed text-paper-faint">
                  This browser can't record video from the page. Try a recent Chrome, Edge,
                  Firefox or Safari.
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {clips.length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="flex flex-col gap-3">
                  {clips.map((c) => (
                    <ClipCard key={c.id} clip={c} />
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function ToggleButton({
  open,
  onClick,
  count,
  active,
}: {
  open: boolean;
  onClick: () => void;
  count: number;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      aria-label={`Clip reel, ${count} ${count === 1 ? "clip" : "clips"}${active ? ", recording" : ""}`}
      className="focus-ring pointer-events-auto absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-20 flex items-center gap-2.5 border border-paper-ghost bg-black/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-paper hover:border-paper-faint hover:bg-black/70 sm:bottom-7 sm:right-10"
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: active ? "rgba(255,140,140,0.92)" : "var(--accent)" }}
      />
      <span>reel {String(count).padStart(2, "0")}</span>
      <span aria-hidden className="text-paper-faint">{open ? "▸" : "◂"}</span>
    </button>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="hud-label hud-label--mute" id={`lbl-${label}`}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-labelledby={`lbl-${label}`}
        onClick={() => onChange(!value)}
        className={`focus-ring relative inline-flex h-[18px] w-8 items-center border transition ${
          value ? "border-accent-dim bg-[rgba(158,200,255,0.20)]" : "border-paper-ghost bg-transparent"
        }`}
      >
        <span
          aria-hidden
          className={`absolute h-[10px] w-[10px] transition-all ${
            value ? "left-[18px] bg-accent" : "left-1 bg-paper-faint"
          }`}
        />
      </button>
    </div>
  );
}

function AspectRow({ value, onChange }: { value: AspectKey; onChange: (a: AspectKey) => void }) {
  const opts: AspectKey[] = ["tiktok", "shorts", "x", "landscape"];
  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Clip aspect">
      <span className="hud-label hud-label--mute">aspect</span>
      <div className="grid grid-cols-2 gap-1">
        {opts.map((o) => (
          <button
            key={o}
            aria-pressed={value === o}
            onClick={() => onChange(o)}
            className={`focus-ring border px-2 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] transition ${
              value === o
                ? "border-accent-dim bg-[rgba(158,200,255,0.10)] text-paper"
                : "border-paper-ghost bg-transparent text-paper-mute hover:border-paper-faint hover:text-paper"
            }`}
          >
            {ASPECT_PRESETS[o].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CaptureNowButton() {
  const active = useCinematicStore((s) => s.active);
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <button
        disabled={active}
        onClick={() => setFailed(!getCaptureDirector()?.manualCapture())}
        className="focus-ring border border-paper-faint px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-paper transition hover:border-accent-dim hover:bg-[rgba(158,200,255,0.06)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {active ? "recording…" : "capture now"}
      </button>
      {failed && !active && (
        <span role="status" className="text-[11px] text-paper-faint">
          Nothing to film yet. Wait for a signal to land and try again.
        </span>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-8 text-center text-[12px] leading-relaxed text-paper-faint">
      <span className="block">No clips yet.</span>
      <span className="mt-1 block">
        Turn on auto-capture to film stories as they form, or use{" "}
        <span className="text-paper">capture now</span>.
      </span>
    </div>
  );
}

function ClipCard({ clip }: { clip: ClipRecord }) {
  const remove = useCinematicStore((s) => s.removeClip);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (previewing) v.play().catch(() => undefined);
    else {
      v.pause();
      v.currentTime = 0;
    }
  }, [previewing]);

  const ext = extensionFor(clip.mimeType).toUpperCase();

  return (
    <li
      className="flex flex-col border border-paper-ghost bg-white/[0.015]"
      onMouseEnter={() => setPreviewing(true)}
      onMouseLeave={() => setPreviewing(false)}
    >
      <button
        type="button"
        aria-label={`Preview ${clip.title.title}`}
        aria-pressed={previewing}
        onClick={() => setPreviewing((p) => !p)}
        onFocus={() => setPreviewing(true)}
        onBlur={() => setPreviewing(false)}
        className="focus-ring relative block w-full"
        style={{ aspectRatio: `${clip.width} / ${clip.height}`, maxHeight: 420 }}
      >
        <video
          ref={videoRef}
          src={clip.url}
          muted
          playsInline
          loop
          preload="metadata"
          className="h-full w-full bg-black object-contain"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        <span className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-2 text-left">
          <span className="block font-mono text-[9px] uppercase tracking-[0.28em] text-paper-mute">
            {clip.title.eyebrow}
          </span>
          <span className="mt-1 block font-display text-[13px] font-light uppercase leading-tight tracking-wide text-paper">
            {clip.title.title}
          </span>
        </span>
        <span className="absolute right-2 top-2 font-mono text-[9px] uppercase tracking-[0.22em] text-paper-faint tabular-nums">
          {Math.round(clip.durationMs / 100) / 10}s · {clip.width}×{clip.height}
        </span>
      </button>

      <div className="flex items-center justify-between border-t border-paper-ghost px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper-faint tabular-nums">
        <span>
          {ext} · {formatBytes(clip.size)}
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => downloadBlobUrl(clip.url, clipFilename(clip))}
            className="focus-ring text-paper hover:text-accent"
          >
            download
          </button>
          <button onClick={() => remove(clip.id)} className="focus-ring text-paper-faint hover:text-paper">
            remove
          </button>
        </div>
      </div>
    </li>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
