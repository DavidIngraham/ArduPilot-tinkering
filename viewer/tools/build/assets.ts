import { readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { applets } from "../../apps/applets/registry";

export function assetSources(root: string) {
  const files = new Map<string, string>();
  function collect(directory: string, prefix: string) {
    try {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const source = join(directory, entry.name),
          url = prefix + entry.name;
        const info = statSync(source);
        if (info.isDirectory()) collect(source, url + "/");
        else if (!/\.(webm|mp4|npz|png)$/.test(entry.name))
          files.set(url, source);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  collect(join(root, "assets/models"), "models/");
  collect(join(root, "assets/recordings"), "");
  collect(join(root, "assets/runtime"), "wasm/");
  collect(join(root, "generated/physics"), "wasm/");
  collect(join(root, "generated/ardupilot"), "wasm/");
  files.set("simulator-sw.js", join(root, "apps/simulator/simulator-sw.js"));
  return files;
}
function glob(pattern: string) {
  return new RegExp(
    "^" +
      pattern
        .split("**/")
        .map((part) =>
          part
            .split("*")
            .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
            .join("[^/]*"),
        )
        .join("(?:.*/)?") +
      "$",
  );
}
export function appAssets(
  definition: (typeof applets)[number],
  sources: Map<string, string>,
  expected: Record<string, string> = {},
) {
  const files = new Set<string>(),
    missing: string[] = [];
  for (const pattern of definition.assets) {
    const pinned = Object.keys(expected).filter((name) =>
      glob(pattern).test(name),
    );
    const matches = pinned.length
      ? pinned
      : [...sources.keys()].filter((name) => glob(pattern).test(name));
    if (!matches.length) missing.push(pattern);
    matches.forEach((name) => {
      if (sources.has(name)) files.add(name);
      else missing.push(name);
    });
  }
  return { files: [...files].sort(), missing };
}
export function inside(root: string, name: string) {
  const result = resolve(root, name),
    rel = relative(resolve(root), result);
  if (!rel || rel.startsWith("..") || resolve(name) === name)
    throw Error(`Unsafe asset path: ${name}`);
  return result;
}
