import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFlight, flightAt, type FlightFrame } from "./flight-state";
const frame = (t: number): FlightFrame => ({
  t,
  p: [t, 0, -10],
  q: [0, 0, 0, 1],
  mode: "MANUAL",
  pwm: [1000, 800, 2400],
  command: [0, 0, 0],
  limits: [
    [1000, 2000, 0],
    [800, 2100, 0],
    [900, 2400, 1],
  ],
  valid: true,
});
test("real-flight interpolation preserves discrete modes and servo outputs", () => {
  const a = frame(0),
    b = {
      ...frame(0.04),
      mode: "AUTO",
      pwm: [1500, 1200, 2000],
      command: [0.5, 0.3, 0.3],
    };
  const f = flightAt([a, b], 0.02);
  assert.equal(f.p[0], 0.02);
  assert.equal(f.mode, "MANUAL");
  assert.deepEqual(f.pwm, a.pwm);
  assert.deepEqual(f.command, a.command);
  assert.equal(flightAt([a, b], 0.04).mode, "AUTO");
});
test("flight replay rejects invalid samples and flags gaps", () => {
  assert.throws(() =>
    parseFlight(
      JSON.stringify({
        schema: "microagu.flight.v1",
        title: "Test", source: "fixture",
        frames: [frame(1), frame(0)],
      }),
    ),
  );
  assert.equal(flightAt([frame(0), frame(1)], 0.5).valid, false);
});

test("flight replay validates calibration and normalized commands", () => {
  const make = (f: FlightFrame) => JSON.stringify({schema:"microagu.flight.v1",title:"Test",source:"fixture",frames:[f,frame(0.04)]});
  assert.equal(parseFlight(make(frame(0))).frames.length, 2);
  assert.throws(() => parseFlight(make({...frame(0),limits:[[0,0,0]]})));
  assert.throws(() => parseFlight(make({...frame(0),command:[2,0,0]})));
});
