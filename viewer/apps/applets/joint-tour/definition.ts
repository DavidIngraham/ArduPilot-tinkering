import type { AppletDefinition } from "@microagu/contracts/applet";
export const definition = {
  id: "joint-tour",
  title: "MicroAGU \u00b7 Joint Tour",
  page: "joint-tour.html",
  entry: "apps/applets/joint-tour/applet.ts",
  kind: "explanation",
  assets: ["models/microagu-payload-tl.glb", "joint-tour/responses.json"],
  controls: ["playback", "camera"],
  defaultCamera: "orbit",
} satisfies AppletDefinition;
