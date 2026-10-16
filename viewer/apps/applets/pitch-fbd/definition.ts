import type { AppletDefinition } from "@microagu/contracts/applet";
export const definition = {
  id: "pitch-fbd",
  title: "MicroAGU \u00b7 Pitch Fbd",
  page: "pitch-fbd.html",
  html: "apps/applets/pitch-fbd/index.html",
  entry: "apps/applets/pitch-fbd/applet.ts",
  kind: "explanation",
  assets: ["models/microagu-payload-tl.glb"],
  controls: ["playback", "camera"],
  defaultCamera: "orbit",
} satisfies AppletDefinition;
