import { test } from "node:test";
import assert from "node:assert/strict";
import { MODES } from "@microagu/contracts/telemetry";
import { pilotChannels } from "@microagu/sim-browser/session/pilot-input";

test("height lever drives AP pitch with fixed power input only in FBWB/CRUISE", () => {
  for (const mode of [MODES.FBWB, MODES.CRUISE]) {
    assert.deepEqual(pilotChannels(mode, 0, 0, 1, 0.45), [1500, 2000, 1450]);
    assert.deepEqual(pilotChannels(mode, 0, 0, 0.5, 0.45), [1500, 1500, 1450]);
    assert.deepEqual(pilotChannels(mode, 0, 0, 0, 0.45), [1500, 1000, 1450]);
  }
  assert.deepEqual(
    pilotChannels(MODES.MANUAL, 0, 1, 0.8, 0.45),
    [1500, 2000, 1800],
  );
  assert.deepEqual(
    pilotChannels(MODES.FBWA, 0, 1, 0.8, 0.45),
    [1500, 1500, 1800],
  );
});
test("autopilot nudges preserve roll and never mix pitch or manual throttle", () => {
  for (const mode of [MODES.AUTO, MODES.LOITER])
    assert.deepEqual(pilotChannels(mode, 0.4, 1, 1, 0.45), [1700, 1500, 1450]);
});
