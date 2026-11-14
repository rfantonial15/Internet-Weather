import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";
import path from "node:path";

/**
 * Share-card URLs must be absolute for most link previews. Set VITE_SITE_URL
 * (e.g. https://weather.example.com) when building for a public host; left
 * unset, the image path stays relative.
 */
function siteUrl(): Plugin {
  const base = (process.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");
  return {
    name: "iw-site-url",
    transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", base),
  };
}

export default defineConfig({
  plugins: [react(), glsl({ compress: false }), siteUrl()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.resolve(__dirname, "src") + "/" },
      { find: /^@iw\/shared$/, replacement: path.resolve(__dirname, "../shared/types.ts") },
      { find: /^@iw\/shared\/(.*)$/, replacement: path.resolve(__dirname, "../shared") + "/$1" },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: "ws://localhost:8787",
        ws: true,
      },
    },
  },
  build: {
    target: "es2022",
    // Maps are generated for debugging but not referenced from the bundle.
    sourcemap: "hidden",
    // three.js alone is ~600 kB minified; split vendors so they download in
    // parallel and stay cached across app deploys.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Only split libraries that don't import React: React-dependent
        // vendors in their own chunks form import cycles with the entry
        // chunk and can evaluate before React exists.
        manualChunks(id) {
          if (/node_modules[\/]three[\/]/.test(id)) return "three";
          if (/node_modules[\/]postprocessing[\/]/.test(id)) return "postfx";
          return undefined;
        },
      },
    },
  },
});
