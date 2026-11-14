import type { EventKind } from "@iw/shared";
import { palette, eventColor } from "@/config/colors";

export interface VisualMapping {
  /** Hex color used for marker, ripple, beam. */
  color: string;
  /** Marker base size, in world units. */
  size: number;
  /** Lifetime multiplier on top of EVENTS.baseLifespanMs. */
  lifeMul: number;
  /** Whether this kind emits a vertical beam from the surface. */
  beam: boolean;
  /** Whether this kind creates an expanding shockwave ripple. */
  ripple: boolean;
}

export const visualByKind: Record<EventKind, VisualMapping> = {
  rage:        { color: eventColor.rage,        size: 0.0108, lifeMul: 1.4, beam: true,  ripple: true },
  wholesome:   { color: eventColor.wholesome,   size: 0.0084, lifeMul: 1.6, beam: false, ripple: true },
  viral:       { color: eventColor.viral,       size: 0.0120, lifeMul: 1.8, beam: true,  ripple: true },
  trend:       { color: eventColor.trend,       size: 0.0096, lifeMul: 1.2, beam: false, ripple: true },
  news:        { color: eventColor.news,        size: 0.0144, lifeMul: 1.0, beam: true,  ripple: true },
  build:       { color: palette.atmosphere,     size: 0.0060, lifeMul: 0.8, beam: false, ripple: false },
  controversy: { color: eventColor.controversy, size: 0.0108, lifeMul: 1.3, beam: true,  ripple: true },
  meme:        { color: eventColor.meme,        size: 0.0084, lifeMul: 1.5, beam: false, ripple: true },
};
