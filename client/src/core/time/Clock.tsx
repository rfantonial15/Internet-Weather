import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { PerspectiveCamera } from "three";
import { frameUniforms, markerScaleFor, updateSunDirection } from "@/core/frameUniforms";
import { earthMapReady } from "@/systems/globe/earthMap";
import { weather } from "@/simulation/WeatherSystem";

/**
 * The one place shared frame uniforms are written:
 *   uTime       scene clock
 *   uLandReady  eases 0 to 1 once the earth map is baked (continents fade in)
 *   uSunDir     real subsolar point, refreshed once a second
 *   uTension    the weather simulation's smoothed tension
 *   uPointScale world-to-pixel factor for point sprites (tracks size, DPR, FOV)
 *   uMarkerScale surface-marker size factor from the camera's altitude
 *
 * Nothing here touches React state, so this never causes a re-render.
 */
export function WorldClock() {
  const lastSun = useRef(-Infinity);

  useFrame((state, dt) => {
    const t = state.clock.getElapsedTime();
    const u = frameUniforms;
    u.uTime.value = t;

    if (u.uLandReady.value < 1 && earthMapReady()) {
      u.uLandReady.value = Math.min(1, u.uLandReady.value + Math.min(dt, 0.1) * 0.8);
    }

    if (t - lastSun.current > 1) {
      lastSun.current = t;
      updateSunDirection();
    }

    u.uTension.value = weather.tension();

    const cam = state.camera;
    u.uMarkerScale.value = markerScaleFor(cam.position.length());
    if (cam instanceof PerspectiveCamera) {
      const h = state.size.height * state.viewport.dpr;
      u.uPointScale.value = h / (2 * Math.tan((cam.fov * Math.PI) / 360));
    }
  });

  return null;
}
