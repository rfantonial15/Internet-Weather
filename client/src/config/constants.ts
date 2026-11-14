/**
 * Single source of truth for scene-scale numbers.
 * Coordinates are in world units; the globe sits at the origin.
 */
export const EARTH_RADIUS = 1.0;
export const ATMOSPHERE_RADIUS = 1.1;

export const CAMERA = {
  /** Fallback distance before the viewport aspect is known. */
  initialDistance: 4.6,
  minDistance: 1.6,
  maxDistance: 11.0,
  baseFov: 34,
  /** Auto-orbit angular velocity (rad/sec) when idle. */
  idleSpin: 0.025,
  /** Linger time on a focused point before auto-releasing. */
  focusHoldMs: 5400,
  /** Linger time on an event the user picked (click / ticker). */
  selectHoldMs: 12000,
  /** Quiet time after user input before the idle orbit resumes. */
  resumeIdleMs: 7000,
  /** Camera distance when the user picks an event. */
  selectDistance: 2.6,
  /**
   * Fraction of the viewport height the globe is lifted above centre, so the
   * signal log at the bottom doesn't sit on top of it. The reticle and the
   * clip crop use the same value (globe centre at 45% of the height).
   */
  viewShift: 0.05,
  /** Same, for portrait viewports (aspect < 0.8). */
  viewShiftPortrait: 0.1,
} as const;

export const EVENTS = {
  /** Maximum live event markers retained on the globe. */
  poolSize: 256,
  /** Default lifespan multiplier (ms) — final value scales with intensity. */
  baseLifespanMs: 9000,
  /** Ripple radius scale per intensity unit. */
  rippleScale: 0.12,
} as const;

/**
 * WebSocket endpoint. `VITE_WS_URL` overrides it at build time; set it to an
 * empty string for a static deploy with no server (the app then runs on its
 * local simulation and narrator without trying to connect). Default: same
 * host over wss on https, or port 8787 on plain http (local dev).
 */
const envWs = import.meta.env.VITE_WS_URL as string | undefined;

export const REALTIME = {
  endpoint:
    envWs !== undefined
      ? envWs
      : typeof window === "undefined"
        ? ""
        : window.location.protocol === "https:"
          ? `wss://${window.location.host}/ws`
          : `ws://${window.location.hostname}:8787/ws`,
  /** First reconnect delay; doubles per failure up to maxReconnectMs. */
  reconnectMs: 1500,
  maxReconnectMs: 30000,
} as const;
