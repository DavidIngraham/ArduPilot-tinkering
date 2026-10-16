import type { AppletDefinition } from "@microagu/contracts/applet";
export const definition = {
  id: "simulation-replay",
  title: "MicroAGU \u00b7 Simulation Replay",
  page: "simulation-replay.html",
  html: "apps/applets/simulation-replay/index.html",
  entry: "apps/applets/simulation-replay/applet.ts",
  kind: "replay",
  assets: [
    "models/microagu-payload-tl.glb",
    "gust-showcase.jsonl",
    "compare-calm.jsonl",
    "compare-gust.jsonl",
    "compare-crosswind.jsonl",
  ],
  controls: ["playback", "camera"],
  defaultCamera: "orbit",
} satisfies AppletDefinition;
