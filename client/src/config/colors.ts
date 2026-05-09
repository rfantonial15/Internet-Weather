import { Color } from "three";
import type { EventKind } from "@iw/shared";

/**
 * Cinematic palette. Kept narrow on purpose — the visual language reads as a
 * single film when every phenomenon pulls from the same restricted set.
 */
export const palette = {
  void: "#05070d",
  deepSpace: "#080c16",
  oceanDeep: "#0a1530",
  oceanShallow: "#1a3a72",
  landNight: "#0e1a2e",
  cityWarm: "#ffb070",
  rim: "#3a8bff",
  atmosphere: "#5cf3ff",
  starWarm: "#ffd6a8",
  starCool: "#bcd9ff",
  rage: "#a96bff",
  rageHot: "#ff4dd2",
  wholesome: "#7df9c6",
  viral: "#ff8a3d",
  trend: "#ffc857",
  news: "#ff5571",
  build: "#5cf3ff",
  controversy: "#c77dff",
  meme: "#ff7ad9",
} as const;

export const eventColor: Record<EventKind, string> = {
  rage: palette.rage,
  wholesome: palette.wholesome,
  viral: palette.viral,
  trend: palette.trend,
  news: palette.news,
  build: palette.build,
  controversy: palette.controversy,
  meme: palette.meme,
};

const cache = new Map<string, Color>();

/** Memoized THREE.Color factory — avoids re-allocating per frame. */
export function color(hex: string): Color {
  let c = cache.get(hex);
  if (!c) {
    c = new Color(hex);
    cache.set(hex, c);
  }
  return c;
}
