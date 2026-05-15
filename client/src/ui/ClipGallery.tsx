import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ASPECT_PRESETS,
  type AspectKey,
  type ClipRecord,
  useCinematicStore,
} from "@/state/useCinematicStore";
import { clipFilename, getCaptureDirector } from "@/cinematic/captureDirector";
import { downloadBlob } from "@/cinematic/clipRecorder";

/**
 * Drawer-style gallery for the clips the capture director has produced.
 *
 *   - Toggle button lives bottom-right of the HUD; opens an inset panel.
 *   - Panel is hard-edged, no rounded corners, in keeping with the rest of
 *     the HUD's "documents over dashboards" tone.
 *   - Each clip lists title, when it fired, the originating event kind,
 *     and download options for TikTok / X / Shorts. (We re-render on the
 *     stored aspect; cross-aspect re-export would require re-recording, so
 *     we just expose direct download of whatever the clip was captured at.)
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

  return (
    <>
      <ToggleButton open={open} onClick={() => setOpen(!open)} unread={clips.length} active={active} />
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.65, 0, 0.35, 1] }}
            className="pointer-events-auto absolute right-0 top-0 z-40 flex h-full w-[360px] flex-col border-l border-white/10 bg-black/75"
          >
            <header className="flex items-center justify-between border-b border-paper-ghost px-5 py-4">
              <div className="flex flex-col gap-0.5">
                <span className="hud-label hud-label--mute">cinematic capture</span>
                <span className="font-display text-[15px] font-light tracking-wide text-paper">
                  trailer reel
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="font-mono text-[10px] uppercase tracking-[0.24em] text-paper-mute hover:text-paper"
              >
                close
              </button>
            </header>

            <div className="flex flex-col gap-3 border-b border-paper-ghost px-5 py-4">
              <ToggleRow label="auto-capture" value={auto} onChange={setAuto} />
              <AspectRow value={preferred} onChange={setPreferred} />
              <CaptureNowButton />
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
  unread,
  active,
}: {
  open: boolean;
  onClick: () => void;
  unread: number;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto absolute bottom-7 right-10 z-20 flex items-center gap-2.5 border border-paper-ghost bg-black/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-paper hover:border-paper-faint hover:bg-black/70"
    >
      {/* Static dot. Active state shifts colour, doesn't pulse. */}
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: active ? "rgba(255,140,140,0.92)" : "var(--accent)" }}
      />
      <span>reel · {String(unread).padStart(2, "0")}</span>
      <span className="text-paper-faint">{open ? "▸" : "◂"}</span>
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
    <label className="flex cursor-pointer items-center justify-between">
      <span className="hud-label hud-label--mute">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-[18px] w-8 items-center border transition ${
          value
            ? "border-accent-dim bg-[rgba(158,200,255,0.20)]"
            : "border-paper-ghost bg-transparent"
        }`}
      >
        <span
          className={`absolute h-[10px] w-[10px] transition-all ${
            value ? "left-[18px] bg-accent" : "left-1 bg-paper-faint"
          }`}
        />
      </button>
    </label>
  );
}

function AspectRow({
  value,
  onChange,
}: {
  value: AspectKey;
  onChange: (a: AspectKey) => void;
}) {
  const opts: AspectKey[] = ["tiktok", "shorts", "x", "landscape"];
  return (
    <div className="flex flex-col gap-2">
      <span className="hud-label hud-label--mute">aspect</span>
      <div className="grid grid-cols-2 gap-1">
        {opts.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`border px-2 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] transition ${
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
  return (
    <button
      disabled={active}
      onClick={() => getCaptureDirector()?.manualCapture()}
      className="border border-paper-faint px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-paper transition hover:border-accent-dim hover:bg-[rgba(158,200,255,0.06)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {active ? "recording…" : "capture now"}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-8 text-center text-[12px] leading-relaxed text-paper-faint">
      <span className="block">No clips yet.</span>
      <span className="mt-1 block">
        Stories are detected automatically — or use{" "}
        <span className="text-paper">capture now</span>.
      </span>
    </div>
  );
}

function ClipCard({ clip }: { clip: ClipRecord }) {
  const remove = useCinematicStore((s) => s.removeClip);
  const dim = ASPECT_PRESETS[clip.aspect];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hovered) v.play().catch(() => undefined);
    else {
      v.pause();
      v.currentTime = 0;
    }
  }, [hovered]);

  const onDownload = () => {
    fetch(clip.url)
      .then((r) => r.blob())
      .then((b) => downloadBlob(b, clipFilename(clip)));
  };

  return (
    <li
      className="flex flex-col border border-paper-ghost bg-white/[0.015]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative" style={{ aspectRatio: `${dim.w} / ${dim.h}` }}>
        <video
          ref={videoRef}
          src={clip.url}
          muted
          playsInline
          loop
          preload="metadata"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-2">
          <span className="block font-mono text-[9px] uppercase tracking-[0.28em] text-paper-mute">
            {clip.title.eyebrow}
          </span>
          <span className="mt-1 block font-display text-[13px] font-light uppercase leading-tight tracking-wide text-paper">
            {clip.title.title}
          </span>
        </div>
        <span className="absolute right-2 top-2 font-mono text-[9px] uppercase tracking-[0.22em] text-paper-faint tabular-nums">
          {Math.round(clip.durationMs / 100) / 10}s · {dim.w}×{dim.h}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-paper-ghost px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper-faint tabular-nums">
        <span>{formatBytes(clip.size)}</span>
        <div className="flex gap-3">
          <button onClick={onDownload} className="text-paper hover:text-accent">
            download
          </button>
          <button
            onClick={() => remove(clip.id)}
            className="text-paper-faint hover:text-paper"
          >
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
