import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";
import path from "node:path";

export default defineConfig({
  plugins: [react(), glsl({ compress: false })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@iw/shared": path.resolve(__dirname, "../shared/types.ts"),
    },
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
    sourcemap: true,
  },
});
