import { create } from "zustand";
import type { Narration } from "@iw/shared";

const KEEP = 24;

interface NarrationState {
  /** Most recent first → easier to render the active narration. */
  recent: Narration[];
  current: Narration | null;
  push(n: Narration): void;
  clearCurrent(): void;
}

/**
 * Narration ring buffer + the "currently visible" pointer.
 *
 * The overlay component reads `current` to render the active sentence; the
 * store rolls forward whenever a new narration arrives. We keep a small
 * history (24) so a future "narration log" panel can scroll through it
 * without re-fetching from the server.
 */
export const useNarrationStore = create<NarrationState>((set) => ({
  recent: [],
  current: null,
  push: (n) =>
    set((s) => {
      const recent = [n, ...s.recent].slice(0, KEEP);
      return { recent, current: n };
    }),
  clearCurrent: () => set({ current: null }),
}));
