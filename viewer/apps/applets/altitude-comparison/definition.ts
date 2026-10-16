import type { AppletDefinition } from "@microagu/contracts/applet";
export const definition = {
  id: "altitude-comparison",
  title: "MicroAGU \u00b7 Altitude Comparison",
  page: "altitude-comparison.html",
  entry: "apps/applets/altitude-comparison/applet.ts",
  kind: "replay",
  assets: ["models/microagu-payload-tl.glb", "altitude-comparison/*.jsonl"],
  controls: ["playback", "camera"],
  defaultCamera: "comparison",
} satisfies AppletDefinition;
