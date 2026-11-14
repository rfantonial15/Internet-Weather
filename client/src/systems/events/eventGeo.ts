import { Vector3 } from "three";
import type { WeatherEvent } from "@iw/shared";
import { geoToVec3 } from "@/utils/geo";
import { EVENTS } from "@/config/constants";
import { visualByKind } from "./eventTypes";

/**
 * Per-event caches shared by the marker / beam / ripple layers. Events are
 * immutable once ingested, so their unit-sphere position and lifetime are
 * computed once instead of three times per frame.
 */
const unitCache = new WeakMap<WeatherEvent, Vector3>();

export function eventUnit(e: WeatherEvent): Vector3 | null {
  if (!e.at) return null;
  let v = unitCache.get(e);
  if (!v) {
    v = geoToVec3(e.at, 1).normalize();
    unitCache.set(e, v);
  }
  return v;
}

/** Lifetime in ms; scales with the kind's multiplier and the intensity. */
export function eventLifeMs(e: WeatherEvent): number {
  return EVENTS.baseLifespanMs * visualByKind[e.kind].lifeMul * (0.6 + e.intensity);
}

/** 0 at birth, 1 at death; values outside [0, 1) mean "not visible". */
export function eventAge(e: WeatherEvent, nowMs: number): number {
  return (nowMs - e.t) / eventLifeMs(e);
}
