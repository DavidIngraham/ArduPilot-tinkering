import { test } from "node:test";
import assert from "node:assert/strict";
import { constrainStick } from "@microagu/applet-ui/controls/joystick";
test("assisted-mode steering ignores vertical travel without reducing horizontal authority", () => {
  assert.deepEqual(constrainStick(1, 10, "line"), [1, 0]);
  assert.deepEqual(constrainStick(-2, -10, "line"), [-1, 0]);
});
test("manual stick has only pull-brake travel and retains a semicircular boundary", () => {
  assert.deepEqual(constrainStick(0, -1, "semicircle"), [0, 0]);
  assert.deepEqual(constrainStick(0, 1, "semicircle"), [0, 1]);
  const [x, y] = constrainStick(1, 1, "semicircle");
  assert.ok(Math.abs(Math.hypot(x, y) - 1) < 1e-12 && x > 0 && y > 0);
});
