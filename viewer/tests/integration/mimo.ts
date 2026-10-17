/** Real WASM firmware, EKF and Rust physics; no controller or sensor mocks. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { HOME, exampleMission } from "../../apps/simulator/missions/default";
import { Simulator } from "@microagu/sim-browser/session/runtime";

Object.defineProperty(globalThis, "crossOriginIsolated", { value: true });
const sim = new Simulator(HOME);
sim.onLog = console.log;
sim.onError = (message) => {
  throw Error(message);
};
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let monitorHandover = false;
let previousThrottle: number | undefined;
let maxThrottleStep = 0;
sim.onTruth = (frame) => {
  if (monitorHandover && previousThrottle !== undefined) {
    maxThrottleStep = Math.max(
      maxThrottleStep,
      Math.abs(frame.throttle! - previousThrottle),
    );
  }
  previousThrottle = frame.throttle;
};
async function switchController(scheme: "baseline" | "lqi") {
  maxThrottleStep = 0;
  monitorHandover = true;
  await sim.controller(scheme);
  await until(() => sim.state.controllerActive === (scheme === "lqi"));
  await delay(500);
  monitorHandover = false;
  assert.ok(
    maxThrottleStep <= 0.08,
    `${scheme} handover throttle step: ${maxThrottleStep}`,
  );
  console.log("HANDOVER", scheme, { maxThrottleStep });
}
async function until(condition: () => boolean, seconds = 15) {
  const deadline = performance.now() + seconds * 1000;
  while (!condition()) {
    assert.ok(
      performance.now() < deadline,
      `Condition timed out: ${JSON.stringify(sim.state)}`,
    );
    await delay(100);
  }
}
const timeout = setTimeout(() => {
  console.error("MIMO test timeout");
  process.exit(1);
}, 180000);
try {
  await sim.start(
    pathToFileURL(resolve("generated/ardupilot/arduplane.js")).href,
    JSON.parse(await readFile("assets/runtime/highdof.json", "utf8")),
    pathToFileURL(resolve("generated/physics/")).href + "/",
  );
  await sim.upload(exampleMission(), () => {});
  await sim.launch("AUTO");
  await until(() => sim.state.alt > 15, 60);
  assert.equal(sim.state.controllerActive, false);
  await switchController("lqi");
  const startAltitude = sim.state.alt;
  const samples: (typeof sim.state)[] = [];
  for (let i = 0; i < 200; i++) {
    await delay(100);
    samples.push({ ...sim.state });
    assert.equal(sim.state.controllerActive, true, "LQI must remain engaged");
    assert.ok(
      Number.isFinite(sim.state.roll) && Number.isFinite(sim.state.pitch),
    );
    assert.ok(
      Math.abs(sim.state.roll) < Math.PI / 3 &&
        Math.abs(sim.state.pitch) < Math.PI / 4,
      `Attitude envelope exceeded: ${JSON.stringify(sim.state)}`,
    );
    assert.ok(sim.state.alt > startAltitude - 10, "LQI must retain altitude");
  }
  await switchController("baseline");
  await delay(5000);
  assert.ok(
    sim.state.alt > startAltitude - 10,
    "Baseline handover must retain altitude",
  );
  await sim.mode("MANUAL");
  await sim.controller("lqi");
  await delay(500);
  assert.equal(
    sim.state.controllerActive,
    false,
    "MANUAL must retain pilot ownership",
  );
  await sim.mode("CRUISE");
  await until(() => sim.state.controllerActive);
  await sim.altitude(sim.state.alt + 2);
  for (const direction of [1, -1]) {
    const startYaw = sim.state.yaw;
    sim.controls(direction * 0.4, 0, 0.5);
    await delay(6000);
    const delta = Math.atan2(
      Math.sin(sim.state.yaw - startYaw),
      Math.cos(sim.state.yaw - startYaw),
    );
    assert.ok(
      direction * delta > 0.05,
      `LQI steering direction ${direction}: ${delta}`,
    );
    assert.equal(sim.state.controllerActive, true);
    sim.controls(0, 0, 0.5);
    await delay(2000);
  }
  await switchController("baseline");
  console.log(
    "MIMO PASS",
    JSON.stringify({
      startAltitude,
      endAltitude: sim.state.alt,
      maxRoll: Math.max(...samples.map((s) => Math.abs(s.roll))),
      maxPitch: Math.max(...samples.map((s) => Math.abs(s.pitch))),
    }),
  );
  clearTimeout(timeout);
  process.exit(0);
} catch (error) {
  console.error(error);
  clearTimeout(timeout);
  process.exit(1);
}
