import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    rollupOptions: {
      input: [
        "index.html",
        "altitude-comparison.html",
        "pitch-comparison.html",
        "flight-replay.html",
        "pitch-fbd.html",
        "trim-launch.html",
        "joint-tour.html",
        "landing.html",
        "controller-comparison.html",
        "rigging-comparison.html",
      ],
      output: { manualChunks: { three: ["three"] } },
    },
  },
});
