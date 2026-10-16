import { defineConfig } from "vite";
import { applets } from "./apps/applets/registry";
import { appletBuild, workerInventory } from "./tools/build/plugin";
export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [appletBuild()],
  experimental: {
    // HTML is emitted at each app's stable root-level URL by appletBuild.
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === "html") return `./${filename}`;
      return { relative: true };
    },
  },
  worker: { plugins: () => [workerInventory()] },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    manifest: true,
    target: "es2022",
    rollupOptions: {
      input: applets.map((app) => app.html),
      output: { manualChunks: { three: ["three"] } },
    },
  },
});
