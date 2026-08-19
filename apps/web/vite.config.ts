import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
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
});
