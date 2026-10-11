import { test } from "node:test";
import assert from "node:assert/strict";
import { Quaternion, Vector3 } from "three";
import {
  validate,
  parseRecording,
  position,
  orientation,
  sample,
  Frame,
} from "./state.ts";
const frame = (t = 0): Frame => ({
  schema: "microagu.state.v1",
  time_s: t,
  state: [
    0, 0, -100, 0, 0, 0, 1, 4, 0, 0, 0, 0, 0, 0, 0, -101, 0, 0, 0, 1, 4, 0, 0,
    0, 0, 0,
  ],
  rpm: 1000,
  voltage_v: 22.2,
  brake_mm: [1, 2],
  throttle: 0.4,
  joint_rotvec_rad: [0, 0, 0],
  joint_rate_rad_s: [0, 0, 0],
  released: true,
});
function close(a: number[], b: number[]) {
  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `${a} != ${b}`));
}
test("NED to render transform is right handed and preserves physical axes", () => {
  close(position([1, 0, 0]).toArray(), [0, 0, -1]);
  close(position([0, 1, 0]).toArray(), [1, 0, 0]);
  close(position([0, 0, 1]).toArray(), [0, -1, 0]);
  const q = orientation([0, 0, 0, 1]);
  close(new Vector3(1, 0, 0).applyQuaternion(q).toArray(), [0, 0, -1]);
  const pitch = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI / 2,
  );
  close(
    new Vector3(1, 0, 0)
      .applyQuaternion(orientation(pitch.toArray()))
      .toArray(),
    [0, 1, 0],
  );
  const roll = new Quaternion().setFromAxisAngle(
    new Vector3(1, 0, 0),
    Math.PI / 2,
  );
  close(
    new Vector3(0, 1, 0).applyQuaternion(orientation(roll.toArray())).toArray(),
    [0, -1, 0],
  );
});
test("interpolation uses quaternion shortest path, handles bounds and missing channels", () => {
  const a = frame(),
    b = frame(2);
  b.state[0] = 10;
  b.state[6] = -1;
  b.rpm = null;
  b.brake_mm = null;
  b.throttle = null;
  const mid = sample([a, b], 1);
  assert.equal(mid.state[0], 5);
  close(mid.state.slice(3, 7), [0, 0, 0, 1]);
  assert.equal(mid.rpm, null);
  assert.equal(mid.brake_mm, null);
  assert.equal(sample([a, b], -1), a);
  assert.equal(sample([a, b], 3), b);
});
test("reject malformed, nonfinite and out of order recordings", () => {
  assert.throws(() => validate({ ...frame(), state: [1] }));
  assert.throws(() => validate({ ...frame(), time_s: Infinity }));
  assert.throws(() => parseRecording(JSON.stringify([frame(2), frame(1)])));
  assert.throws(() => parseRecording("[]"));
  assert.throws(() => parseRecording(JSON.stringify([frame(), frame()])));
  assert.equal(
    parseRecording(JSON.stringify(frame()) + "\n" + JSON.stringify(frame(1)))
      .length,
    2,
  );
});
