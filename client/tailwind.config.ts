import type { Config } from "tailwindcss";

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
          900: "#05070d",
          800: "#080c16",
          700: "#0c1322",
          600: "#101a30",
        },
        signal: {
          cyan: "#5cf3ff",
          blue: "#3a8bff",
          violet: "#a96bff",
          magenta: "#ff4dd2",
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
