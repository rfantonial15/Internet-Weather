import { create } from "zustand";
import type { Story } from "@/cinematic/storyDetector";
import type { TrailerTitle } from "@/cinematic/titleGenerator";

export type CapturePhase = "idle" | "reveal" | "push" | "climax" | "outro";
export type AspectKey = "tiktok" | "x" | "shorts" | "landscape";

export interface ClipRecord {
  id: string;
  story: Story;
  title: TrailerTitle;
  /** Object URL pointing at a Blob in memory. Revoked when the clip is removed. */
  url: string;
  /** Aspect this clip was rendered at — also drives default share intent. */
  aspect: AspectKey;
  durationMs: number;
  /** ms since epoch — used as "captured at" in the gallery. */
  t: number;
  /** Pixel size the clip was rendered at, for reference in the gallery. */
  width: number;
  height: number;
  /** Bytes — gallery shows this so users know what they're downloading. */
  size: number;
}

interface CinematicState {
  /** True while the capture director is recording a shot. */
  active: boolean;
  /** Active story (live during capture). */
  story: Story | null;
  /** Active title card. */
  title: TrailerTitle | null;
  /** Where in the 3-act sequence we are. */
  phase: CapturePhase;
  /** 0..1 progress through the active shot. */
  progress: number;
  /** Stack of finished clips, newest first. */
  clips: ClipRecord[];
  /** Whether the gallery panel is open. */
  galleryOpen: boolean;
  /** Default aspect for new captures; persists for the session. */
  preferredAspect: AspectKey;
  /** Whether captures should auto-fire on detected stories. */
  autoCapture: boolean;

  begin(story: Story, title: TrailerTitle): void;
  setPhase(p: CapturePhase): void;
  setProgress(v: number): void;
  end(): void;
  pushClip(c: ClipRecord): void;
  removeClip(id: string): void;
  setGalleryOpen(v: boolean): void;
  setPreferredAspect(a: AspectKey): void;
  setAutoCapture(v: boolean): void;
}

const MAX_CLIPS = 12;

export const useCinematicStore = create<CinematicState>((set, get) => ({
  active: false,
  story: null,
  title: null,
  phase: "idle",
  progress: 0,
  clips: [],
  galleryOpen: false,
  preferredAspect: "tiktok",
  // Off by default — auto-capture overlays letterbox + title cards on top of
  // the live scene, which is great for highlight reels but obscures the HUD
  // during normal viewing. Users opt in from the gallery panel.
  autoCapture: false,

  begin: (story, title) =>
    set({ active: true, story, title, phase: "reveal", progress: 0 }),
  setPhase: (p) => set({ phase: p }),
  setProgress: (v) => set({ progress: v }),
  end: () =>
    set({ active: false, story: null, title: null, phase: "idle", progress: 0 }),

  pushClip: (c) =>
    set((s) => {
      const next = [c, ...s.clips];
      // Keep only the most recent N — older ones get their object URLs revoked.
      if (next.length > MAX_CLIPS) {
        const dropped = next.slice(MAX_CLIPS);
        for (const d of dropped) URL.revokeObjectURL(d.url);
      }
      return { clips: next.slice(0, MAX_CLIPS) };
    }),

  removeClip: (id) => {
    const c = get().clips.find((c) => c.id === id);
    if (c) URL.revokeObjectURL(c.url);
    set((s) => ({ clips: s.clips.filter((c) => c.id !== id) }));
  },

  setGalleryOpen: (v) => set({ galleryOpen: v }),
  setPreferredAspect: (a) => set({ preferredAspect: a }),
  setAutoCapture: (v) => set({ autoCapture: v }),
}));

export const ASPECT_PRESETS: Record<AspectKey, { w: number; h: number; label: string }> = {
  tiktok:    { w: 1080, h: 1920, label: "TikTok · 9:16" },
  shorts:    { w: 1080, h: 1920, label: "YouTube Shorts · 9:16" },
  x:         { w: 1080, h: 1080, label: "X / Twitter · 1:1" },
  landscape: { w: 1920, h: 1080, label: "Wide · 16:9" },
};
