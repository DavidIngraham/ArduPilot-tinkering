/** Paired AUTO scenario using actual firmware/EKF and deterministic weather. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { HOME, exampleMission } from "../../apps/simulator/missions/default";
import { defaultWeather } from "../../apps/simulator/weather";
import { Simulator } from "@microagu/sim-browser/session/runtime";

Object.defineProperty(globalThis, "crossOriginIsolated", { value: true });
const scheme = process.argv[2];
assert.ok(scheme === "baseline" || scheme === "lqi");
const output = process.argv[3];
assert.ok(output);
const sim = new Simulator(HOME);
sim.onLog = console.log;
sim.onError = (message) => {
  throw Error(message);
};
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const timeout = setTimeout(() => process.exit(1), 240000);
try {
  await sim.start(
    pathToFileURL(resolve("generated/ardupilot/arduplane.js")).href,
    JSON.parse(await readFile("assets/runtime/highdof.json", "utf8")),
    pathToFileURL(resolve("generated/physics/")).href + "/",
  );
  sim.physics.setWind(1, 90, 0, defaultWeather);
  await sim.upload(exampleMission(), () => {});
  await sim.launch("AUTO");
  const launchTime = sim.physics.time;
  while (sim.physics.time < launchTime + 20) await delay(100);
  await sim.controller(scheme);
  const start = sim.physics.time;
  const samples: Array<Record<string, number | boolean | null>> = [];
  while (sim.physics.time < start + 100) {
    await delay(200);
    const s = sim.state;
    samples.push({
      time: sim.physics.time - start,
      altitude: s.alt,
      targetAltitude: s.targetAlt,
      crossTrack: s.crossTrack,
      roll: s.roll,
      pitch: s.pitch,
      active: s.controllerActive,
      mission: s.mission,
      latitude: s.lat,
      longitude: s.lon,
      yaw: s.yaw,
      targetRoll: s.targetRoll,
    });
    assert.ok(s.alt > 3, `Ground contact during ${scheme} comparison`);
    assert.ok(
      Math.abs(s.roll) < Math.PI / 3 && Math.abs(s.pitch) < Math.PI / 4,
      `Attitude envelope exceeded: ${JSON.stringify(s)}`,
    );
    if (sim.physics.time > start + 2)
      assert.equal(s.controllerActive, scheme === "lqi");
  }
  const settled = samples.filter((s) => Number(s.time) >= 20);
  const rms = (f: (s: (typeof samples)[number]) => number) =>
    Math.sqrt(settled.reduce((sum, s) => sum + f(s) ** 2, 0) / settled.length);
  const report = {
    scheme,
    weather: defaultWeather,
    windSpeed: 1,
    windFrom: 90,
    duration: 100,
    metricsWindow: [20, 100],
    metrics: {
      altitudeRms: rms((s) => Number(s.altitude) - Number(s.targetAltitude)),
      crossTrackRms: rms((s) => Number(s.crossTrack)),
      pitchRms: rms((s) => Number(s.pitch)),
      finalMission: sim.state.mission,
    },
    samples,
    build: JSON.parse(await readFile("assets/runtime/build.json", "utf8")),
  };
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log("COMPARISON PASS", scheme, report.metrics);
  clearTimeout(timeout);
  process.exit(0);
} catch (error) {
  console.error(error);
  clearTimeout(timeout);
  process.exit(1);
}
