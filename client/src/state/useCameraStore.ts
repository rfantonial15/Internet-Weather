import { create } from "zustand";
import { Vector3 } from "three";
import type { GeoPoint, WeatherEvent } from "@iw/shared";
import { geoToVec3 } from "@/utils/geo";
import { CAMERA } from "@/config/constants";
import type { CameraDirector, CinematicShot } from "@/core/camera/cameraDirector";

/**
 *   idle   slow auto-orbit
 *   free   the user is steering; resumes idle after a quiet spell
 *   focus  turned toward a point or a selected event; resumes idle after a hold
 */
export type CameraMode = "idle" | "focus" | "free";

interface CameraState {
  mode: CameraMode;
  /** Focus target on the unit sphere. */
  target: Vector3;
  /** Geo coords of the focus, kept verbatim for HUD readouts. */
  targetGeo: GeoPoint | null;
  /** The event the user picked (globe click or ticker), if any. */
  selected: WeatherEvent | null;
  /** Desired distance from origin while focused. */
  distance: number;
  focusUntil: number;
  /** performance.now() of the last user input on the scene. */
  lastInteraction: number;
  focusOn(p: GeoPoint, opts?: { distance?: number; durationMs?: number }): void;
  /** Turn toward an event and show its details in the HUD. */
  select(e: WeatherEvent): void;
  /** User touched the camera: enter free mode (drops any focus). */
  interact(): void;
  release(): void;
}

export const useCameraStore = create<CameraState>((set) => ({
  mode: "idle",
  target: new Vector3(1, 0, 0),
  targetGeo: null,
  selected: null,
  distance: CAMERA.initialDistance,
  focusUntil: 0,
  lastInteraction: 0,
  focusOn: (p, opts) =>
    set({
      mode: "focus",
      target: geoToVec3(p, 1),
      targetGeo: p,
      selected: null,
      distance: opts?.distance ?? 2.4,
      focusUntil: performance.now() + (opts?.durationMs ?? CAMERA.focusHoldMs),
    }),
  select: (e) => {
    if (!e.at) return;
    set({
      mode: "focus",
      target: geoToVec3(e.at, 1),
      targetGeo: e.at,
      selected: e,
      distance: CAMERA.selectDistance,
      focusUntil: performance.now() + CAMERA.selectHoldMs,
    });
  },
  interact: () =>
    set((s) =>
      s.mode === "free"
        ? { lastInteraction: performance.now() }
        : { mode: "free", lastInteraction: performance.now(), targetGeo: null, selected: null },
    ),
  release: () => set({ mode: "idle", focusUntil: 0, targetGeo: null, selected: null }),
}));

/**
 * Where the globe centre sits on screen, as a fraction of the viewport
 * height above the middle. CinematicCamera writes it (and the `--globe-y`
 * CSS variable the reticle and readout use); the clip recorder crops by it.
 */
export const viewFrame: { shift: number } = { shift: CAMERA.viewShift };

/**
 * Director handle. The CinematicCamera component registers its director
 * instance here on mount; the capture pipeline calls these to start shots
 * without React having to be in the loop.
 */
let activeDirector: CameraDirector | null = null;

export function registerDirector(d: CameraDirector | null) {
  activeDirector = d;
}

export function startCinematicShot(shot: CinematicShot): boolean {
  if (!activeDirector) return false;
  activeDirector.startShot(shot);
  return true;
}

export function endCinematicShot() {
  activeDirector?.endShot();
}

export function cinematicShotProgress(): number | null {
  return activeDirector?.shotProgress() ?? null;
}
