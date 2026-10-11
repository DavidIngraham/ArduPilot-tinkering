import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Vector3, Texture } from "three";
import {
  RotorPhase,
  brakeAngle,
  rigPayload,
  poseMechanisms,
  phaseAt,
} from "./mechanisms.ts";
import type { Frame } from "./state.ts";
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test("RPM integration and arbitrary-time phase are independent of playback sampling", () => {
  const clock = new RotorPhase();
  close(clock.advance(0, 60), 0);
  close(clock.advance(0.25, 60), Math.PI / 2);
  close(clock.advance(0.5, 120), Math.PI * 1.25);
  const frames = [
    { time_s: 0, rpm: 60 },
    { time_s: 1, rpm: 120 },
  ] as Frame[];
  close(phaseAt(frames, [0, Math.PI], 0.5), Math.PI * 1.25);
  close(phaseAt(frames, [0, Math.PI], 0.5), Math.PI * 1.25);
  clock.reset();
  close(clock.advance(2, null), 0);
  close(clock.advance(3, null), 0);
  close(brakeAngle(27.5, 0), 1);
});
test("actual CAD rig preserves rest placement and rotates around fixed shafts", async () => {
  const bytes = await readFile(
    new URL("../public/models/microagu-payload-tl.glb", import.meta.url),
  );
  const gltf = await new GLTFLoader()
    .register(() => ({
      name: "HeadlessTextures",
      loadTexture: () => Promise.resolve(new Texture()),
    }))
    .parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
  gltf.scene.updateMatrixWorld(true);
  const before = new Map();
  gltf.scene.traverse((n) => before.set(n.uuid, n.matrixWorld.clone()));
  const rig = rigPayload(gltf.scene);
  assert.ok(rig, "All named CAD mechanisms must resolve");
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((n) => {
    if (before.has(n.uuid))
      n.matrixWorld.elements.forEach((v, i) =>
        close(v, before.get(n.uuid).elements[i]),
      );
  });
  const centers = [rig.rotor, rig.left, rig.right].map((n) =>
    n.getWorldPosition(new Vector3()),
  );
  poseMechanisms(rig, Math.PI / 2, [37.5, 25], [10, 25]);
  gltf.scene.updateMatrixWorld(true);
  close(rig.left.rotation.y, 1);
  close(rig.right.rotation.y, 0);
  close(rig.rotor.rotation.x, Math.PI / 2);
  [rig.rotor, rig.left, rig.right].forEach((n, i) =>
    close(n.getWorldPosition(new Vector3()).distanceTo(centers[i]), 0),
  );
  assert.equal(rig.rotor.children.length, 2);
  assert.equal(rig.left.children.length, 2);
  assert.equal(rig.right.children.length, 2);
});
