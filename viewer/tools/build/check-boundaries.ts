import ts from "typescript";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";

const allowed: Record<string, string[]> = {
  contracts: [],
  playback: ["contracts"],
  rendering: ["contracts"],
  "sim-browser": ["contracts"],
  "applet-ui": ["contracts", "rendering", "playback"],
};
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(`${dir}/${e.name}`)
      : e.name.endsWith(".ts")
        ? [`${dir}/${e.name}`]
        : [],
  );
}
const failures: string[] = [];
for (const file of files("packages")) {
  const owner = file.split("/")[1],
    source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const spec = node.moduleSpecifier;
      if (spec && ts.isStringLiteral(spec)) check(spec.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      check(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  function check(spec: string) {
    let target = spec.startsWith("@microagu/") ? spec.split("/")[1] : null;
    if (spec.startsWith(".")) {
      const dest = relative(
        resolve("."),
        resolve(dirname(file), spec),
      ).replaceAll("\\", "/");
      if (dest.startsWith("apps/"))
        failures.push(`${file}: package imports application ${spec}`);
      if (dest.startsWith("packages/")) target = dest.split("/")[1];
      if (dest.startsWith("generated/") && owner !== "sim-browser")
        failures.push(
          `${file}: only sim-browser may load generated runtime bindings`,
        );
    }
    if (target && target !== owner && !allowed[owner].includes(target))
      failures.push(`${file}: forbidden dependency on ${target}`);
    if (
      ["contracts", "playback", "sim-browser"].includes(owner) &&
      spec.startsWith("three")
    )
      failures.push(`${file}: ${owner} must not depend on Three.js`);
  }
  visit(source);
  if (
    ["contracts", "playback"].includes(owner) &&
    /\b(document|window|HTMLElement|CanvasRenderingContext2D)\b/.test(
      source.text,
    )
  )
    failures.push(`${file}: data package uses DOM APIs`);
}
for (const file of files("apps")) {
  if (file === "apps/applets/registry.ts") continue;
  const owner = file.startsWith("apps/applets/")
    ? file.split("/").slice(0, 3).join("/")
    : "apps/simulator";
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(node: ts.Node) {
    let spec: string | undefined;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      spec = node.moduleSpecifier.text;
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      spec = node.arguments[0].text;
    if (spec) {
      if (
        owner !== "apps/simulator" &&
        spec.startsWith("@microagu/sim-browser")
      )
        failures.push(`${file}: replay applet imports simulator runtime`);
      if (spec.startsWith(".")) {
        const dest = relative(
          resolve("."),
          resolve(dirname(file), spec),
        ).replaceAll("\\", "/");
        if (dest.startsWith("apps/") && !dest.startsWith(owner + "/"))
          failures.push(
            `${file}: imports another application's implementation ${spec}`,
          );
        if (dest.startsWith("generated/"))
          failures.push(
            `${file}: generated bindings must be loaded through sim-browser`,
          );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (failures.length) throw Error(failures.join("\n"));
console.log("Workspace dependency boundaries verified");
