import type { Config } from "tailwindcss";

/**
 * Design tokens.
 *
 * The chrome (HUD / overlays) uses a near-monochrome scale: paper, paper-mute,
 * paper-faint, with a single restrained cool accent. The 3D scene gets its own
 * saturated palette in `src/config/colors.ts` — that's intentional: the planet
 * is the subject and earns colour; the UI around it is the frame and stays
 * out of the way.
 *
 * The legacy `signal.*` colours stay defined for the few places that genuinely
 * narrate planetary phenomena (event-kind glyphs, tension dial), but they no
 * longer drive primary chrome.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', "ui-monospace", "monospace"],
        display: ['"Space Grotesk"', "Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ink: {
          900: "#04060c",
          800: "#070b15",
          700: "#0c1322",
          600: "#101a30",
        },
        // Near-monochrome scale for chrome. Use these for any UI text or rule.
        paper: {
          DEFAULT: "rgba(232, 240, 252, 0.96)",
          mute:    "rgba(214, 226, 244, 0.72)",
          faint:   "rgba(196, 212, 234, 0.46)",
          ghost:   "rgba(180, 200, 224, 0.22)",
        },
        // The single chrome accent. Calm cool — close to white with a cast.
        accent: {
          DEFAULT: "#9ec8ff",
          dim:     "rgba(158, 200, 255, 0.55)",
          edge:    "rgba(158, 200, 255, 0.18)",
        },
        signal: {
          // Retained for the 3D-scene-adjacent surfaces that already narrate
          // planetary state. Avoid using these for primary chrome.
          cyan: "#5cf3ff",
          blue: "#3a8bff",
          violet: "#a96bff",
          ember: "#ff8a3d",
          aurora: "#7df9c6",
        },
      },
      letterSpacing: {
        widest2: "0.32em",
      },
    },
  },
  plugins: [],
} satisfies Config;
