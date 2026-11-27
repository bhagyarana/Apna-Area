/**
 * Feature: Vite Build & Dev Proxy Configuration
 * Purpose: Bundles the React app into web/dist and proxies /api/* to the Fastify server during local development.
 * Inputs: web/index.html and web/src/* TypeScript/CSS modules.
 * Outputs: Production static assets in web/dist.
 * Deliberately excludes: Embedding server environment secrets into define/env client bundles.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022",
  },
});
