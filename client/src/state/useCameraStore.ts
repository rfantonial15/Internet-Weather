import { create } from "zustand";
import { Vector3 } from "three";
import type { GeoPoint } from "@iw/shared";
import { geoToVec3 } from "@/utils/geo";
import { CAMERA } from "@/config/constants";
import type { CameraDirector, CinematicShot } from "@/core/camera/cameraDirector";

export type CameraMode = "idle" | "focus" | "free";

interface CameraState {
  mode: CameraMode;
  /** Target the camera is looking at, on the unit sphere. */
  target: Vector3;
  /** Original geo coords of the focus, kept verbatim for HUD readouts. */
  targetGeo: GeoPoint | null;
  /** Desired distance from origin. */
  distance: number;
  focusUntil: number;
  focusOn(p: GeoPoint, opts?: { distance?: number; durationMs?: number }): void;
  release(): void;
  setDistance(d: number): void;
}

export const useCameraStore = create<CameraState>((set) => ({
  mode: "idle",
  target: new Vector3(1, 0, 0),
  targetGeo: null,
  distance: CAMERA.initialDistance,
  focusUntil: 0,
  focusOn: (p, opts) =>
    set(() => ({
      mode: "focus",
      target: geoToVec3(p, 1),
      targetGeo: p,
      distance: opts?.distance ?? 2.4,
      focusUntil: performance.now() + (opts?.durationMs ?? CAMERA.focusHoldMs),
    })),
  release: () => set({ mode: "idle", focusUntil: 0, targetGeo: null }),
  setDistance: (d) => set({ distance: d }),
}));

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
