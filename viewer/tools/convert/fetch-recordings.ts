/** Restore missing published excerpts by pinned hash; never overwrite local research data. */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { inside } from "../build/assets";
import { parseArgs } from "node:util";
const { values } = parseArgs({
  options: { destination: { type: "string", default: "assets/recordings" } },
});
const manifest = JSON.parse(
  readFileSync("assets/manifests/recordings.json", "utf8"),
);
if (manifest.schema !== "microagu.recording-assets.v1")
  throw Error("Unsupported recording manifest");
let count = 0;
for (const [name, hash] of Object.entries(manifest.sha256)) {
  const file = inside(values.destination!, name);
  if (existsSync(file)) {
    if (createHash("sha256").update(readFileSync(file)).digest("hex") !== hash)
      throw Error(`Local recording differs: ${name}; refusing to overwrite it`);
    continue;
  }
  const response = await fetch(new URL(name, manifest.baseURL));
  if (!response.ok) throw Error(`${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw Error(`Published recording hash mismatch: ${name}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes, { flag: "wx" });
  count++;
}
console.log(`Restored ${count} verified presentation datasets`);
