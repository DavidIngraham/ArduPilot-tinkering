import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { Physics } from "../src/simulator/physics";
import { validate } from "../src/state";
const config = JSON.parse(await readFile("public/wasm/highdof.json", "utf8"));
const fixture = JSON.parse(
  await readFile("tools/fixtures/highdof-parity.json", "utf8"),
);
const physics = await Physics.load(
  pathToFileURL(resolve("public/wasm/")).href + "/",
  config,
);
let maxError = 0;
function compare(a: number[], b: number[], label: string, tolerance = 1e-7) {
  assert.equal(a.length, b.length, label);
  for (let i = 0; i < a.length; i++) {
    const error = Math.abs(a[i] - b[i]);
    maxError = Math.max(error, maxError);
    assert.ok(
      error < tolerance,
      `${label}[${i}]: ${a[i]} != ${b[i]} (${error})`,
    );
  }
}
for (let i = 0; i < fixture.steps; i++) {
  const pwm = [1500, 1500, 800, 2400, ...Array(12).fill(1500)];
  if (i >= 200 && i < 700) {
    pwm[0] = 1550;
    pwm[2] = 960;
    pwm[3] = 1900;
  }
  if (i >= 700) {
    pwm[0] = 1430;
    pwm[2] = 1450;
    pwm[3] = 2250;
  }
  const packet = new Uint8Array(40),
    view = new DataView(packet.buffer);
  view.setUint16(0, 18458, true);
  view.setUint16(2, 400, true);
  view.setUint32(4, i, true);
  pwm.forEach((v, c) => view.setUint16(8 + 2 * c, v, true));
  physics.released = i >= 20;
  const response = physics.respond(packet),
    sensors = JSON.parse(response);
  const expected = fixture.samples.find((s: any) => s.frame === i);
  if (!expected) continue;
  const truth = validate(physics.truth());
  compare(truth.state, expected.truth.state, "state");
  compare(truth.brake_mm!, expected.truth.brake_mm, "actuator");
  compare([truth.rpm!], [expected.truth.rpm], "RPM");
  compare(
    truth.joint_rotvec_rad,
    expected.truth.joint_rotvec_rad,
    "joint attitude",
  );
  compare(
    truth.joint_rate_rad_s,
    expected.truth.joint_rate_rad_s,
    "joint rate",
  );
  compare(
    sensors.imu.accel_body,
    expected.sensors.imu.accel_body,
    "IMU acceleration",
    1e-6,
  );
  compare(sensors.imu.gyro, expected.sensors.imu.gyro, "IMU gyro");
  compare(sensors.position, expected.sensors.position, "IMU position");
  compare(sensors.velocity, expected.sensors.velocity, "IMU velocity");
  // Duplicate packets must not advance time, actuator or rotor state.
  const time = physics.time;
  assert.equal(physics.respond(packet), response);
  assert.equal(physics.time, time);
}
console.log(
  `PASS: ${fixture.steps} steps, ${fixture.samples.length} native/Python parity checkpoints; maximum absolute difference ${maxError}`,
);
