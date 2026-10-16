import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { inside } from "../build/assets";

const { values } = parseArgs({
  options: {
    destination: { type: "string" },
    app: { type: "string", multiple: true },
    source: { type: "string", default: "dist" },
  },
});
if (!values.destination)
  throw Error(
    "Usage: npm run publish -- --destination SITE_DIRECTORY [--app simulator]",
  );
const source = resolve(values.source!),
  destination = resolve(values.destination);
const manifest = JSON.parse(
  readFileSync(resolve(source, "applet-manifest.json"), "utf8"),
);
if (manifest.schema !== "microagu.applets.v1")
  throw Error("Unsupported build manifest");
const selected = values.app ?? Object.keys(manifest.applets),
  files = new Map<string, string>();
for (const id of selected) {
  const app = manifest.applets[id];
  if (!app) throw Error(`Unknown applet ${id}`);
  if (!app.available)
    throw Error(`${id}: missing datasets: ${app.missing.join(", ")}`);
  for (const [name, hash] of Object.entries(app.files))
    files.set(name, hash as string);
}
// Verify every input before writing anything to the destination.
for (const [name, hash] of files) {
  const actual = createHash("sha256")
    .update(readFileSync(inside(source, name)))
    .digest("hex");
  if (actual !== hash)
    throw Error(`Build artifact changed after manifest generation: ${name}`);
  inside(destination, name);
}
for (const name of files.keys()) {
  const target = inside(destination, name);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(inside(source, name), target);
}
for (const id of selected)
  writeFileSync(
    inside(destination, `${id}-manifest.json`),
    JSON.stringify(manifest.applets[id], null, 2) + "\n",
  );
console.log(
  `Published ${selected.length} applets and ${files.size} verified files to ${destination}`,
);
