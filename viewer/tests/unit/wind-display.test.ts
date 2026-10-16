import { test } from "node:test";
import assert from "node:assert/strict";
import { windTruthLabel } from "../../apps/simulator/weather";

test("wind truth displays from-bearing and NED vertical sign", () => {
  assert.equal(
    windTruthLabel([-2, 0, -1.5]),
    "WIND TRUTH · 2.0 m/s from 0° · ↑ 1.5 m/s",
  );
  assert.equal(
    windTruthLabel([0, -2, 0.5]),
    "WIND TRUTH · 2.0 m/s from 90° · ↓ 0.5 m/s",
  );
  assert.equal(windTruthLabel([0, 0, 0]), "WIND TRUTH · 0.0 m/s · ↕ 0.0 m/s");
  assert.equal(windTruthLabel([NaN, 0, 0]), "WIND TRUTH · —");
});
