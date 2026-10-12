import { test } from "node:test";
import assert from "node:assert/strict";
import { cameraPath, cameraAt } from "./camera-path";
import { position, type Frame } from "./state";
test("camera and aircraft remain coincident during constant-speed travel at off-grid replay times, including endpoints", () => {
  const frames = Array.from(
    { length: 101 },
    (_, i) =>
      ({
        time_s: i * 0.02,
        state: [4.4 * i * 0.02, 0.3 * i * 0.02, -100 - 0.5 * i * 0.02],
      }) as Frame,
  );
  const path = cameraPath(frames);
  for (const t of [0, 0.003, 0.017, 0.039, 0.7, 1.013, 1.987, 2])
    assert.ok(
      cameraAt(frames, path, t).distanceTo(
        position([4.4 * t, 0.3 * t, -100 - 0.5 * t]),
      ) < 1e-10,
    );
});
test("boxcar reference suppresses oscillation rather than using two phase-dependent endpoints", () => {
  const frames = Array.from({ length: 501 }, (_, i) => {
    const t = i * 0.02;
    return {
      time_s: t,
      state: [4.4 * t + 0.1 * Math.sin(2 * Math.PI * 2 * t), 0, -100],
    } as Frame;
  });
  const path = cameraPath(frames);
  for (let t = 1; t < 9; t += 0.017)
    assert.ok(Math.abs(cameraAt(frames, path, t).z + 4.4 * t) < 0.003);
});
