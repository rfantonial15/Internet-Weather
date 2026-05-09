/**
 * Single source of truth for scene-scale numbers.
 * Coordinates are in world units; the globe sits at the origin.
 */
export const EARTH_RADIUS = 1.0;
export const ATMOSPHERE_RADIUS = 1.06;

export const CAMERA = {
  initialDistance: 3.4,
  minDistance: 1.6,
  maxDistance: 8.0,
  baseFov: 32,
  /** Auto-orbit angular velocity (rad/sec) when idle. */
  idleSpin: 0.025,
  /** Linger time on a focused event before auto-releasing. */
  focusHoldMs: 5400,
} as const;

export const EVENTS = {
  /** Maximum live event markers retained on the globe. */
  poolSize: 256,
  /** Default lifespan multiplier (ms) — final value scales with intensity. */
  baseLifespanMs: 9000,
  /** Ripple radius scale per intensity unit. */
  rippleScale: 0.35,
} as const;

export const REALTIME = {
  endpoint:
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? `wss://${window.location.host}/ws`
      : `ws://${
          typeof window !== "undefined" ? window.location.hostname : "localhost"
        }:8787/ws`,
  reconnectMs: 1500,
} as const;
