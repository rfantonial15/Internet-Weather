import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, AdditiveBlending, Color } from "three";
import { frameUniforms } from "@/core/frameUniforms";
import { weather } from "@/simulation/WeatherSystem";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";
import { palette } from "@/config/colors";
import { EARTH_RADIUS } from "@/config/constants";

/**
 * Auroral ovals: soft green-to-cyan curtains in a ring around each pole
 * (roughly 60 to 75 degrees latitude), on a shell just above the clouds.
 * Strongest on the night side and at grazing angles, where real curtains
 * stack up. Wholesome activity (`weather.ambient.wholesome`) brightens them.
 */
export function AuroraField() {
  const detail = profiles[useUIStore((s) => s.quality)].sphereDetail;

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: frameUniforms.uTime,
          uSunDir: frameUniforms.uSunDir,
          uEnergy: { value: 0 },
          uColorA: { value: new Color(palette.wholesome) },
          uColorB: { value: new Color(palette.atmosphere) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormalW;
          varying vec3 vViewDir;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vNormalW = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - wp.xyz);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uSunDir;
          uniform float uEnergy;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          varying vec3 vNormalW;
          varying vec3 vViewDir;

          void main() {
            vec3 N = normalize(vNormalW);
            vec3 V = normalize(vViewDir);

            // Oval band in |sin(lat)|: peaks near 67 degrees.
            float s = abs(N.y);
            float band = smoothstep(0.84, 0.91, s) * (1.0 - smoothstep(0.93, 0.975, s));
            if (band < 0.001) discard;

            // Curtains: folded bands along longitude that drift and shimmer.
            float lon = atan(N.z, N.x);
            float fold = sin(lon * 7.0 + sin(lon * 3.0 + uTime * 0.21) * 1.6 + uTime * 0.12);
            float rays = 0.55 + 0.45 * sin(lon * 41.0 - uTime * 0.9);
            float curtain = smoothstep(-0.2, 1.0, fold) * rays;

            float night = smoothstep(0.25, -0.2, dot(N, normalize(uSunDir)));
            float graze = 0.35 + 0.65 * pow(1.0 - max(dot(N, V), 0.0), 1.5);

            float a = band * curtain * graze * (0.25 + 0.75 * night) * (0.18 + uEnergy * 0.6);
            vec3 col = mix(uColorA, uColorB, smoothstep(0.88, 0.96, s));
            gl_FragColor = vec4(col * a * 1.6, a);
          }
        `,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    material.uniforms.uEnergy.value = weather.ambient.wholesome;
  });

  return (
    <mesh material={material} renderOrder={5}>
      <sphereGeometry args={[EARTH_RADIUS * 1.02, detail * 2, detail]} />
    </mesh>
  );
}
