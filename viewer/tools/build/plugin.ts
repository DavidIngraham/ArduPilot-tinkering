import {
  readFileSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve, extname } from "node:path";
import type { Plugin, Manifest } from "vite";
import { applets } from "../../apps/applets/registry";
import { assetSources, appAssets, inside } from "./assets";

const workerFiles = new Set<string>();
export function workerInventory(): Plugin {
  return {
    name: "microagu-worker-inventory",
    generateBundle(_options, bundle) {
      for (const file of Object.keys(bundle)) workerFiles.add(file);
    },
  };
}
export function appletBuild(): Plugin {
  let root = "",
    out = "";
  return {
    name: "microagu-applets",
    configResolved(config) {
      root = config.root;
      out = resolve(root, config.build.outDir);
    },
    configureServer(server) {
      const sources = assetSources(root);
      server.middlewares.use((req, res, next) => {
        const name = decodeURIComponent((req.url ?? "").split("?")[0]).replace(
            /^\//,
            "",
          ),
          source = sources.get(name);
        if (!source) return next();
        const type: Record<string, string> = {
          ".wasm": "application/wasm",
          ".js": "text/javascript",
          ".json": "application/json",
          ".jsonl": "text/plain",
          ".glb": "model/gltf-binary",
        };
        res.setHeader(
          "Content-Type",
          type[extname(source)] ?? "application/octet-stream",
        );
        res.end(readFileSync(source));
      });
    },
    closeBundle() {
      const manifest = JSON.parse(
        readFileSync(resolve(out, ".vite/manifest.json"), "utf8"),
      ) as Manifest;
      const sources = assetSources(root);
      const expected = JSON.parse(
        readFileSync(resolve(root, "assets/manifests/recordings.json"), "utf8"),
      ).sha256 as Record<string, string>;
      const result: Record<string, unknown> = {};
      for (const definition of applets) {
        const entry = manifest[definition.page];
        if (!entry) throw Error(`Missing Vite entry ${definition.page}`);
        const files = new Set<string>([definition.page]),
          seen = new Set<string>();
        function visit(key: string) {
          if (seen.has(key)) return;
          seen.add(key);
          const chunk = manifest[key];
          if (!chunk) throw Error(`Missing chunk ${key}`);
          files.add(chunk.file);
          chunk.css?.forEach((f) => files.add(f));
          chunk.assets?.forEach((f) => files.add(f));
          [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])].forEach(
            visit,
          );
        }
        visit(definition.page);
        if (definition.kind === "simulator")
          workerFiles.forEach((f) => files.add(f));
        const assets = appAssets(definition, sources, expected);
        for (const name of assets.files) {
          if (
            expected[name] &&
            createHash("sha256")
              .update(readFileSync(sources.get(name)!))
              .digest("hex") !== expected[name]
          )
            throw Error(
              `Recording changed: ${name}. Review provenance and update the recording inventory explicitly.`,
            );
          const dest = inside(out, name);
          mkdirSync(dirname(dest), { recursive: true });
          copyFileSync(sources.get(name)!, dest);
          files.add(name);
        }
        if (assets.missing.length)
          this.warn(
            `${definition.id}: missing local datasets: ${assets.missing.join(", ")}; publishing this applet will fail.`,
          );
        const hashes = Object.fromEntries(
          [...files].sort().map((name) => {
            const file = inside(out, name);
            statSync(file);
            return [
              name,
              createHash("sha256").update(readFileSync(file)).digest("hex"),
            ];
          }),
        );
        result[definition.id] = {
          ...definition,
          available: assets.missing.length === 0,
          missing: assets.missing,
          files: hashes,
        };
      }
      writeFileSync(
        resolve(out, "applet-manifest.json"),
        JSON.stringify(
          { schema: "microagu.applets.v1", applets: result },
          null,
          2,
        ) + "\n",
      );
    },
  };
}
