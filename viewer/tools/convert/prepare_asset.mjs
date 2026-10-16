/** Prepare a SolidWorks export for the simulator's nominal Trout Lake payload frame.
 * Node 22+. Keep source CAD untouched; preserve assembly and component names.
 */
import { NodeIO } from "@gltf-transform/core";
import { KHRMeshQuantization } from "@gltf-transform/extensions";
import { dedup, weld, quantize, prune } from "@gltf-transform/functions";
import { readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
const [source, modelFile, destination] = process.argv.slice(2);
if (!source || !modelFile || !destination)
  throw Error(
    "Usage: node tools/convert/prepare_asset.mjs raw.glb napkin-payload-model.json output.glb",
  );
try {
  await stat(destination);
  throw Error("Destination already exists");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const model = JSON.parse(await readFile(modelFile, "utf8"));
const cg = model.cases.find(
  (c) => c.case === "nominal" && c.with_lead,
).CG_cad_m;
const io = new NodeIO().registerExtensions([KHRMeshQuantization]),
  doc = await io.read(source),
  root = doc.getRoot();
const assembly = root.listNodes().find((n) => n.getName() === "microAGU");
if (!assembly)
  throw Error("Expected microAGU assembly node in SolidWorks export");
for (const scene of root.listScenes())
  for (const node of scene.listChildren()) scene.removeChild(node);
const wrapper = doc
  .createNode("Payload FRD / nominal Trout Lake CG")
  .setRotation([1, 0, 0, 0])
  .setTranslation([-cg[0], cg[1], cg[2]])
  .setExtras({
    frame: "FRD",
    origin: "Nominal Trout Lake model CG (estimated)",
    CG_cad_m: cg,
    propeller: "CAD asset is APC 9x6; flight hardware was 9x4.5. Visual only.",
  });
wrapper.addChild(assembly);
root.listScenes()[0].addChild(wrapper);
// Remove only internal fasteners. Retain battery/electronics and named mechanisms.
for (const node of root.listNodes())
  if (node.getName().startsWith("m3_standard")) node.dispose();
await doc.transform(
  prune(),
  dedup(),
  weld(),
  quantize({ quantizePosition: 14, quantizeNormal: 10 }),
  prune(),
);
await mkdir(dirname(destination), { recursive: true });
await io.write(destination, doc);
const bytes = await readFile(destination);
await writeFile(
  destination + ".json",
  JSON.stringify(
    {
      generator: "tools/convert/prepare_asset.mjs",
      source_name: "microAGU.SLDASM exported by SOLIDWORKS 2026",
      source_sha256: createHash("sha256")
        .update(await readFile(source))
        .digest("hex"),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      frame: "body FRD",
      CG_cad_m: cg,
      CG_basis: "nominal with-lead case from napkin-payload-model.json",
      processing:
        "Removed cameras and internal m3 fasteners; deduplicated, welded and quantized meshes; no change to source CAD.",
      notes: [
        "Canopy and suspension lines remain schematic.",
        "CAD prop is 9x6, real flight prop was 9x4.5.",
        "Ballast is not represented in CAD; CG uses the existing estimated Trout Lake model.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Prepared ${destination}: ${(bytes.length / 1048576).toFixed(2)} MiB`,
);
