import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: ["index.html", "flight-replay.html"],
      output: { manualChunks: { three: ["three"] } },
    },
  },
});
