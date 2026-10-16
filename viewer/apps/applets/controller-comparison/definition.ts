import type { AppletDefinition } from "@microagu/contracts/applet";
export const definition = {
  id: "controller-comparison",
  title: "MicroAGU \u00b7 Controller Comparison",
  page: "controller-comparison.html",
  html: "apps/applets/controller-comparison/index.html",
  entry: "apps/applets/controller-comparison/applet.ts",
  kind: "replay",
  assets: ["models/microagu-payload-tl.glb", "controller-comparison/**/*.json"],
  controls: ["playback", "camera"],
  defaultCamera: "comparison",
} satisfies AppletDefinition;
