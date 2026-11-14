import { create } from "zustand";
import type { QualityTier } from "@/config/quality";
import { detectTier, TIER_ORDER } from "@/config/quality";

interface UIState {
  booted: boolean;
  connected: boolean;
  quality: QualityTier;
  /** True when `?q=low|medium|high|ultra` pinned the tier (adaptation off). */
  qualityPinned: boolean;
  fps: number;
  /** True while the WebGL context is lost (GPU reset, tab backgrounded on mobile). */
  glLost: boolean;
  /** Field guide (legend) panel open. */
  guideOpen: boolean;
  setGuideOpen(v: boolean): void;
  finishBoot(): void;
  setGlLost(v: boolean): void;
  setConnected(v: boolean): void;
  setQuality(q: QualityTier): void;
  setFps(f: number): void;
}

function pinnedTier(): QualityTier | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("q");
  return q && (TIER_ORDER as string[]).includes(q) ? (q as QualityTier) : null;
}

const pinned = pinnedTier();

export const useUIStore = create<UIState>((set) => ({
  booted: false,
  connected: false,
  quality: pinned ?? detectTier(),
  qualityPinned: pinned !== null,
  fps: 60,
  glLost: false,
  guideOpen: false,
  setGuideOpen: (v) => set({ guideOpen: v }),
  finishBoot: () => set({ booted: true }),
  setGlLost: (v) => set({ glLost: v }),
  setConnected: (v) => set({ connected: v }),
  setQuality: (q) => set({ quality: q }),
  setFps: (f) => set((s) => (s.fps === f ? s : { fps: f })),
}));
