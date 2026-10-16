import type { AppletDefinition } from "@microagu/contracts/applet";
export const definition = {
  id: "pitch-comparison",
  title: "MicroAGU \u00b7 Pitch Comparison",
  page: "pitch-comparison.html",
  html: "apps/applets/pitch-comparison/index.html",
  entry: "apps/applets/pitch-comparison/applet.ts",
  kind: "replay",
  assets: ["models/microagu-payload-tl.glb", "pitch-sign/*.jsonl"],
  controls: ["playback", "camera"],
  defaultCamera: "comparison",
} satisfies AppletDefinition;
