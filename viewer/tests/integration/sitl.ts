import { HOME, exampleMission } from "../../apps/simulator/missions/default";
/** Integration test against the packaged firmware, without browser mocks. */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { validate } from "@microagu/contracts/recordings";
import { Simulator } from "@microagu/sim-browser/session/runtime";

Object.defineProperty(globalThis, "crossOriginIsolated", { value: true });
const sim = new Simulator(HOME);
sim.onLog = (text) => console.log(text);
sim.onError = (text) => {
  console.error(text);
  process.exit(1);
};
let truthFrames = 0,
  maxJoint = 0;
sim.onTruth = (frame) => {
  validate(frame);
  truthFrames++;
  maxJoint = Math.max(maxJoint, Math.hypot(...frame.joint_rotvec_rad));
};
const timeout = setTimeout(() => {
  console.error("Integration timeout");
  process.exit(1);
}, 180000);
try {
  await sim.start(
    pathToFileURL(resolve("generated/ardupilot/arduplane.js")).href,
    JSON.parse(await readFile("assets/runtime/highdof.json", "utf8")),
    pathToFileURL(resolve("generated/physics/")).href + "/",
  );
  console.log("BOOT OK");
  assert.ok(Math.abs(sim.state.alt) < 2, "EKF must initialize on the ground");
  for (const mode of ["MANUAL", "FBWA", "CRUISE"]) {
    await sim.mode(mode);
    console.log("MODE OK", mode);
  }
  await sim.upload(exampleMission(), (n) => console.log("MISSION REQUEST", n));
  console.log("UPLOAD OK");
  // Give GPS/EKF initialization a bounded period, retaining normal arming checks.
  let armed = false;
  for (let i = 0; i < 12; i++) {
    try {
      await sim.launch("AUTO");
      armed = true;
      break;
    } catch (e) {
      console.log("Waiting for prearm:", String(e));
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  assert.ok(
    armed && sim.physics.released,
    "Paraglider must arm and release airborne physics",
  );
  assert.ok(
    sim.state.alt > 2 && sim.state.alt < 15,
    `Ground home datum must be preserved: ${sim.state.alt}`,
  );
  console.log("GROUND LAUNCH OK", JSON.stringify(sim.state));
  await sim.execute();
  assert.equal(sim.state.mode, 10);
  console.log("AUTO OK");
  sim.physics.setWind(1.5, 270, 0.2);
  const before = { ...sim.state };
  await new Promise((r) => setTimeout(r, 12000));
  assert.equal(
    sim.physics.launchPhase,
    2,
    "Assisted launch must release into free flight",
  );
  assert.ok(
    sim.state.alt > 3,
    `AUTO must climb after launch: ${sim.state.alt}`,
  );
  assert.ok(
    Math.abs(sim.state.lat - before.lat) +
      Math.abs(sim.state.lon - before.lon) >
      0.00005,
    "Aircraft must fly",
  );
  assert.ok(
    sim.state.mission >= 1,
    "Mission must advance to a navigation item",
  );
  console.log("FLIGHT OK", JSON.stringify(sim.state));
  await sim.mode("FBWA");
  sim.controls(0.6, 0, 0.6);
  const yaw = sim.state.yaw;
  await new Promise((r) => setTimeout(r, 8000));
  const change = Math.atan2(
    Math.sin(sim.state.yaw - yaw),
    Math.cos(sim.state.yaw - yaw),
  );
  assert.ok(
    Math.abs(change) > 0.2,
    "Pilot RC input must change aircraft heading",
  );
  console.log("STEERING OK", change);
  sim.controls(0, 0, 0.45);
  await sim.mode("MANUAL");
  await new Promise((r) => setTimeout(r, 2000));
  assert.equal(sim.state.mode, 0);
  await sim.mode("CRUISE");
  assert.equal(sim.state.mode, 7);
  console.log("MANUAL TAKEOVER AND CRUISE OK");
  assert.ok(
    truthFrames > 50 && maxJoint > 0.01,
    "Independent canopy/payload truth must stream",
  );
  console.log("9-DOF TRUTH OK", {
    truthFrames,
    maxJoint,
    simTime: sim.physics.time,
  });
  clearTimeout(timeout);
  process.exit(0);
} catch (e) {
  console.error(e);
  clearTimeout(timeout);
  process.exit(1);
}
