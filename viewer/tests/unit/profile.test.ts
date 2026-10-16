import { test } from "node:test";
import assert from "node:assert/strict";
import type { Frame } from "@microagu/contracts/recordings";
import { flightProfile } from "@microagu/applet-ui/charts/profile";
test("side profile unwraps a closed ground track and uses NED altitude", () => {
  const frames = [
    [0, 0, -90],
    [3, 0, -91],
    [3, 4, -89],
    [0, 0, -90],
  ].map((state, time_s) => ({ state, time_s }) as Frame);
  const p = flightProfile(frames);
  assert.deepEqual(
    p.map((p) => p.distance),
    [0, 3, 7, 12],
  );
  assert.deepEqual(
    p.map((p) => p.altitude),
    [90, 91, 89, 90],
  );
  assert.deepEqual(flightProfile([]), []);
});
