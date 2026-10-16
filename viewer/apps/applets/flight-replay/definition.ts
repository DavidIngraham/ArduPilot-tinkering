import type { AppletDefinition } from "@microagu/contracts/applet";
export const definition = {
  id: "flight-replay",
  title: "MicroAGU \u00b7 Flight Replay",
  page: "flight-replay.html",
  html: "apps/applets/flight-replay/index.html",
  entry: "apps/applets/flight-replay/applet.ts",
  kind: "replay",
  assets: ["models/microagu-payload-tl.glb", "flight-replays/*.json"],
  controls: ["playback", "camera"],
  defaultCamera: "orbit",
} satisfies AppletDefinition;
