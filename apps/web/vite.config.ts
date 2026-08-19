/// <reference types="vitest/config" />
import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // The web app manifest lives in public/manifest.json and is linked
      // from index.html. The plugin only generates the service worker with
      // its default (generateSW) precaching strategy — nothing custom.
      manifest: false,
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: false,
  },
});
