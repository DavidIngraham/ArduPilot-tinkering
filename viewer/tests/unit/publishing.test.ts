import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { inside, appAssets } from "../../tools/build/assets";
import { definition } from "../../apps/applets/rigging-comparison/definition";

test("asset declarations include nested poses and reject traversal", () => {
  const sources = new Map([
    ["models/microagu-payload-tl.glb", "model"],
    ["rigging-comparison/data.json", "data"],
    ["rigging-comparison/poses/run.json", "pose"],
  ]);
  assert.equal(appAssets(definition, sources).files.length, 3);
  assert.deepEqual(appAssets(definition, sources).missing, []);
  assert.throws(() => inside("/tmp/site", "../escape"));
  assert.throws(() => inside("/tmp/site", "/tmp/escape"));
});
test("publisher rejects changed artifacts before creating destination files", () => {
  const root = mkdtempSync(join(tmpdir(), "microagu-publish-"));
  try {
    const source = join(root, "source"),
      destination = join(root, "site");
    mkdirSync(source);
    writeFileSync(join(source, "index.html"), "changed");
    writeFileSync(
      join(source, "applet-manifest.json"),
      JSON.stringify({
        schema: "microagu.applets.v1",
        applets: {
          test: {
            available: true,
            files: {
              "index.html": createHash("sha256")
                .update("original")
                .digest("hex"),
            },
          },
        },
      }),
    );
    const run = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "tools/publish/publish.ts",
        "--source",
        source,
        "--destination",
        destination,
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /artifact changed/);
    assert.equal(existsSync(destination), false);
  } finally {
    rmSync(root, { recursive: true });
  }
});
