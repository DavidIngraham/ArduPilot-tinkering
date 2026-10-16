import type { AppletDefinition } from "@microagu/contracts/applet";
export const definition = {
  id: "trim-launch",
  title: "MicroAGU \u00b7 Trim Launch",
  page: "trim-launch.html",
  html: "apps/applets/trim-launch/index.html",
  entry: "apps/applets/trim-launch/applet.ts",
  kind: "explanation",
  assets: ["models/microagu-payload-tl.glb"],
  controls: ["playback", "camera"],
  defaultCamera: "orbit",
} satisfies AppletDefinition;
