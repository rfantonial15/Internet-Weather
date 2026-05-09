import { create } from "zustand";
import { Vector3 } from "three";
import type { GeoPoint } from "@iw/shared";
import { geoToVec3 } from "@/utils/geo";
import { CAMERA } from "@/config/constants";

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
