import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: [
        "index.html",
        "flight-replay.html",
        "pitch-fbd.html",
        "trim-launch.html",
        "joint-tour.html",
        "landing.html",
      ],
      output: { manualChunks: { three: ["three"] } },
    },
  },
});
