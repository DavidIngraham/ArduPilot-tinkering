import type { AppletDefinition } from "@microagu/contracts/applet";
export const definition = {
  id: "landing",
  title: "MicroAGU \u00b7 Landing",
  page: "landing.html",
  html: "apps/applets/landing/index.html",
  entry: "apps/applets/landing/applet.ts",
  kind: "replay",
  assets: ["models/microagu-payload-tl.glb", "landing/*.json"],
  controls: ["playback", "camera"],
  defaultCamera: "orbit",
} satisfies AppletDefinition;
