import { create } from "zustand";
import type { WeatherEvent } from "@iw/shared";
import { EVENTS } from "@/config/constants";

/**
 * Ring buffer of recent events. Visual systems subscribe to a slice of this
 * store rather than each holding their own queue, so we never duplicate state.
 */
interface EventState {
  events: WeatherEvent[];
  /** Latest event id for cheap "did anything new happen?" checks. */
  lastId: string | null;
  push(e: WeatherEvent): void;
  clear(): void;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  lastId: null,
  push: (e) =>
    set((s) => {
      const next = s.events.length >= EVENTS.poolSize ? s.events.slice(1) : s.events;
      return { events: [...next, e], lastId: e.id };
    }),
  clear: () => set({ events: [], lastId: null }),
}));
