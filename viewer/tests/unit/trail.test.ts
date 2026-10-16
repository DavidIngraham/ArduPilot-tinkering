import test from "node:test";
import assert from "node:assert/strict";
import { FlightTrail } from "@microagu/rendering/scene/trail";

test("trail retains chronological bounded history while hidden", () => {
  const trail = new FlightTrail(3);
  for (let i = 0; i < 7; i++) trail.record(i, [i, 2 * i, -3]);
  assert.equal(trail.visible, false);
  const { start, count } = trail.geometry.drawRange;
  const points = trail.geometry.getAttribute("position");
  assert.equal(count, 3);
  assert.deepEqual(
    Array.from({ length: count }, (_, i) => [
      points.getX(start + i),
      points.getY(start + i),
      points.getZ(start + i),
    ]),
    [
      [8, 3, -4],
      [10, 3, -5],
      [12, 3, -6],
    ],
  );
  trail.visible = true;
  assert.equal(trail.geometry.drawRange.count, 3);
});

test("trail skips stationary and over-frequent samples and clears on rewind", () => {
  const trail = new FlightTrail(3);
  trail.record(1, [0, 0, 0]);
  trail.record(1.1, [1, 0, 0]);
  trail.record(2, [0, 0, 0]);
  assert.equal(trail.geometry.drawRange.count, 1);
  trail.record(3, [2, 0, 0]);
  assert.equal(trail.geometry.drawRange.count, 2);
  trail.record(0, [0, 0, 0]);
  assert.equal(trail.geometry.drawRange.count, 1);
});
