import type { AppletDefinition } from "@microagu/contracts/applet";
export const definition = {
  id: "rigging-comparison",
  title: "MicroAGU \u00b7 Rigging Comparison",
  page: "rigging-comparison.html",
  entry: "apps/applets/rigging-comparison/applet.ts",
  kind: "replay",
  assets: ["models/microagu-payload-tl.glb", "rigging-comparison/**/*.json"],
  controls: ["playback", "camera"],
  defaultCamera: "comparison",
} satisfies AppletDefinition;
