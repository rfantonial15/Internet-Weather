import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { PerspectiveCamera, Raycaster, Sphere, Vector2, Vector3 } from "three";
import { CameraDirector } from "./cameraDirector";
import { useCameraStore, registerDirector, viewFrame } from "@/state/useCameraStore";
import { useEventStore } from "@/state/useEventStore";
import { eventAge, eventUnit } from "@/systems/events/eventGeo";
import { CAMERA, EARTH_RADIUS } from "@/config/constants";
import { vec3ToGeo } from "@/utils/geo";

/** Pointer travel (px) below which a press counts as a click, not a drag. */
const CLICK_SLOP_PX = 6;
const KEY_ROTATE = 0.12;

/**
 * Bridges the CameraDirector (pure math) with R3F's camera, and owns user
 * input on the canvas:
 *
 *   drag            orbit (snappy while held, glides after release)
 *   wheel / pinch   zoom
 *   click           pick the nearest live event (or look at that spot)
 *   double-click    reset zoom
 *   arrows, + / -   orbit and zoom from the keyboard; Esc releases focus
 *
 * Any input switches the camera store to "free"; after CAMERA.resumeIdleMs of
 * quiet it drifts back into the idle orbit. A running cinematic shot owns the
 * camera outright, so input is ignored until it ends.
 */
export function CinematicCamera() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const director = useMemo(() => new CameraDirector(), []);
  const tmp = useRef(new Vector3());

  useEffect(() => {
    registerDirector(director);
    return () => registerDirector(null);
  }, [director]);

  // Frame for the viewport and lift the globe above the signal log.
  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const aspect = size.width / size.height;
    director.setAspect(aspect);
    // Portrait phones stack a taller HUD under the globe; lift it further.
    const shift = aspect < 0.8 ? CAMERA.viewShiftPortrait : CAMERA.viewShift;
    viewFrame.shift = shift;
    document.documentElement.style.setProperty("--globe-y", `${((0.5 - shift) * 100).toFixed(2)}%`);
    if (camera instanceof PerspectiveCamera) {
      camera.setViewOffset(size.width, size.height, 0, size.height * shift, size.width, size.height);
      camera.updateProjectionMatrix();
    }
  }, [director, camera, size.width, size.height]);

  // Reduced motion: calmer idle spin, no shake.
  const idleSpin = useRef<number>(CAMERA.idleSpin);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      idleSpin.current = mq.matches ? CAMERA.idleSpin * 0.3 : CAMERA.idleSpin;
      director.motionScale = mq.matches ? 0 : 1;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [director]);

  // Re-aim only when the focus target actually changes.
  useEffect(() => {
    let lastTarget: Vector3 | null = null;
    return useCameraStore.subscribe((s) => {
      if (s.mode === "focus" && s.target !== lastTarget) {
        lastTarget = s.target;
        director.setFocus(s.target, s.distance);
      } else if (s.mode !== "focus") {
        lastTarget = null;
      }
    });
  }, [director]);

  // --- Input ---------------------------------------------------------------
  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let downX = 0;
    let downY = 0;
    let travel = 0;
    let pinchDist = 0;
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const globe = new Sphere(new Vector3(), EARTH_RADIUS);
    const hit = new Vector3();

    const interact = () => useCameraStore.getState().interact();
    const locked = () => director.hasActiveShot();

    /** Radians of orbit per pixel; slower when zoomed in. */
    const orbitGain = () =>
      (Math.PI / Math.max(320, el.clientHeight)) *
      Math.min(1.2, director.distance / CAMERA.initialDistance + 0.15);

    const pinchSpan = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const pick = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectSphere(globe, hit)) return;
      hit.normalize();

      // Nearest visible event within a screen-friendly angular radius.
      const now = Date.now();
      const maxAngle = 0.06 * (director.distance / CAMERA.initialDistance) + 0.015;
      const minDot = Math.cos(maxAngle);
      let best = null;
      let bestDot = minDot;
      for (const e of useEventStore.getState().events) {
        const u = eventUnit(e);
        if (!u) continue;
        const age = eventAge(e, now);
        if (age < 0 || age >= 1) continue;
        const d = u.dot(hit);
        if (d > bestDot) {
          bestDot = d;
          best = e;
        }
      }
      const store = useCameraStore.getState();
      if (best) store.select(best);
      else store.focusOn(vec3ToGeo(hit), { distance: Math.max(2.4, director.distance * 0.8) });
    };

    const onDown = (e: PointerEvent) => {
      if (locked()) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        downX = e.clientX;
        downY = e.clientY;
        travel = 0;
      } else if (pointers.size === 2) {
        pinchDist = pinchSpan();
        travel = Infinity; // a pinch is never a click
      }
      director.setDragging(true);
    };

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev || locked()) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        travel = Math.max(travel, Math.hypot(e.clientX - downX, e.clientY - downY));
        if (travel < CLICK_SLOP_PX) return;
        const k = orbitGain();
        director.rotateBy(-dx * k, dy * k);
        interact();
      } else if (pointers.size === 2) {
        const span = pinchSpan();
        if (pinchDist > 0 && span > 0) director.zoomBy(pinchDist / span);
        pinchDist = span;
        interact();
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (pointers.size === 0) {
        director.setDragging(false);
        if (travel < CLICK_SLOP_PX && e.type === "pointerup" && !locked()) {
          pick(e.clientX, e.clientY);
        }
      } else if (pointers.size === 1) {
        pinchDist = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (locked()) return;
      // deltaMode 1 = lines (Firefox); normalise to pixels.
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      director.zoomBy(Math.exp(Math.max(-1, Math.min(1, dy * 0.0015))));
      interact();
    };

    const onDblClick = () => {
      if (locked()) return;
      director.resetZoom();
      interact();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && t !== document.body && t !== el && t.closest("input, textarea, select, button, a, [role=dialog]")) return;
      if (locked()) return;
      let handled = true;
      switch (e.key) {
        case "ArrowLeft": director.rotateBy(KEY_ROTATE, 0); break;
        case "ArrowRight": director.rotateBy(-KEY_ROTATE, 0); break;
        case "ArrowUp": director.rotateBy(0, KEY_ROTATE * 0.6); break;
        case "ArrowDown": director.rotateBy(0, -KEY_ROTATE * 0.6); break;
        case "+": case "=": director.zoomBy(0.88); break;
        case "-": case "_": director.zoomBy(1 / 0.88); break;
        case "Escape": useCameraStore.getState().release(); return;
        default: handled = false;
      }
      if (handled) {
        e.preventDefault();
        interact();
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onDblClick);
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [gl, camera, director]);

  // --- Per frame -----------------------------------------------------------
  useFrame((_, rawDt) => {
    // A hidden tab resumes with a huge dt; clamp so the camera doesn't jump.
    const dt = Math.min(rawDt, 0.1);
    const store = useCameraStore.getState();
    const now = performance.now();

    // A cinematic shot fully owns the camera until it finishes.
    if (!director.hasActiveShot()) {
      if (store.mode === "focus") {
        if (now > store.focusUntil) store.release();
      } else if (store.mode === "free") {
        if (now - store.lastInteraction > CAMERA.resumeIdleMs) store.release();
        else director.hold();
      }
      if (useCameraStore.getState().mode === "idle") director.setIdle(dt, idleSpin.current);
    }

    director.step(dt, tmp.current);
    camera.position.copy(tmp.current);
    camera.lookAt(0, 0, 0);

    if (camera instanceof PerspectiveCamera) {
      const desired = director.fov;
      // Skip sub-degree changes; projection matrix updates are not free.
      if (Math.abs(camera.fov - desired) > 0.05) {
        camera.fov = desired;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
