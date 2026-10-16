import type { AppletDefinition } from "@microagu/contracts/applet";
export const definition = {
  id: "replay",
  title: "MicroAGU \u00b7 Replay",
  page: "index.html",
  entry: "apps/applets/replay/applet.ts",
  kind: "replay",
  assets: ["models/microagu-payload-tl.glb"],
  controls: ["playback", "camera"],
  defaultCamera: "orbit",
} satisfies AppletDefinition;
