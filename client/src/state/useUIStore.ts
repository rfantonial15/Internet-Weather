import { create } from "zustand";
import type { QualityTier } from "@/config/quality";
import { detectTier } from "@/config/quality";

interface UIState {
  booted: boolean;
  connected: boolean;
  quality: QualityTier;
  fps: number;
  finishBoot(): void;
  setConnected(v: boolean): void;
  setQuality(q: QualityTier): void;
  setFps(f: number): void;
}

export const useUIStore = create<UIState>((set) => ({
  booted: false,
  connected: false,
  quality: detectTier(),
  fps: 60,
  finishBoot: () => set({ booted: true }),
  setConnected: (v) => set({ connected: v }),
  setQuality: (q) => set({ quality: q }),
  setFps: (f) => set({ fps: f }),
}));
