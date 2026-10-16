/** Run explicitly after reviewing new research exports; builds never rewrite provenance. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { assetSources, appAssets } from "../build/assets";
import { applets } from "../../apps/applets/registry";
const sources = assetSources(process.cwd()),
  sha256: Record<string, string> = {};
for (const app of applets) {
  const assets = appAssets(app, sources);
  if (assets.missing.length)
    throw Error(`Missing assets for ${app.id}: ${assets.missing}`);
  for (const name of assets.files) {
    if (
      !name.startsWith("models/") &&
      !name.startsWith("wasm/") &&
      name !== "simulator-sw.js"
    )
      sha256[name] = createHash("sha256")
        .update(readFileSync(sources.get(name)!))
        .digest("hex");
  }
}
mkdirSync("assets/manifests", { recursive: true });
writeFileSync(
  "assets/manifests/recordings.json",
  JSON.stringify(
    {
      schema: "microagu.recording-assets.v1",
      baseURL: "https://davidingraham.github.io/assets/microagu-viewer/",
      sha256,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Recorded ${Object.keys(sha256).length} presentation datasets`);
