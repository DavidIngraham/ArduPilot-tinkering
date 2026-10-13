# Micro-AGU: Next Flight Test Card

[Build](micro-agu-design.md) · [Flight history](flight-testing.md) · [Controller design](controller-design.md) · [Data and methods](data-and-methods.md)

**Phase 3 · Model validation and staged controller evaluation · Revision 1, October 12, 2026**

The next flight should measure ordinary up-and-away behavior: throttle-to-climb response, payload pitch motion, and sustained turns in both directions. Those measurements will tell us whether the flight-informed simulator is useful for choosing controller settings. Reproducing the powered, high-bank Hood River turn is outside this card.

This is a published test plan, not a record of a completed test or a released flight configuration. The sequence below is a menu for several short sorties; completing every item in one flight is not the objective. **The minimum useful sortie is a stable baseline, repeatable small throttle changes, and one ordinary turn in each direction.**

## Test-day cover sheet

Fill these fields before launch. The pilot sets the operating limits for the actual field and conditions; the simulation's altitude and wind settings are not flight limits.

| Item | Record before launch |
| --- | --- |
| Date, site, pilot and observer | __________ |
| Sortie / configuration ID | __________ |
| Firmware commit and build identifier | __________ |
| Saved parameter file and mission file | __________ |
| All-up mass, battery and ballast | __________ |
| Left/right brake setup and rigging revision | __________ |
| Mean wind, direction and gust range | __________ |
| Working altitude band and minimum recovery altitude | __________ |
| Test-area boundary and landing area | __________ |
| Maximum permitted bank, turn rate and climb/sink rate | __________ |
| Battery voltage/capacity landing reserve | __________ |
| Tested pilot takeover mode and switch | __________ |
| Next maneuver and its prebriefed input limit | __________ |

**Historical comparison:** Trout Lake's ballasted configuration was 1.758 kg; the unballasted configuration was 1.385 kg. The reported battery was 6S, 6 Ah total. These are reference values, not substitutes for weighing and checking the next aircraft. The reported propulsion was an FFTY 900 KV motor and 9×4.5 pusher propeller, clockwise viewed from behind.

## Configuration decision before flight

The flight-tested Trout Lake controller and the dedicated simulation-development controller are different implementations. Switching between them is not necessarily a gain change or a flight-mode change. Verify the actual firmware behavior, and use separate sorties/builds when needed. Do not assume a switch restores the old controller.

| Configuration | Evidence and purpose |
| --- | --- |
| **F — flight baseline** | Recovered Trout Lake flight-tested configuration, including the damper being disabled. Reconfirm hardware compatibility and exact settings before using it. Establish ordinary aircraft response. |
| **S — simulation baseline** | Dedicated heading-rate controller, 4 Hz lateral measurement filtering, two-stage 1.5 Hz pitch damping, and the preceding climb-PI scaling (`TECS_VERT_ACC = 7`). This is a simulation baseline, not an aircraft-proven fallback. |
| **L — lateral candidate** | Change only `PG_TURN_FILT` from 4 to 1 Hz relative to S. Native AUTO trials passed separately; the main consistent benefit was quieter brake commands. |
| **V — longitudinal candidate** | Change only `TECS_VERT_ACC` from 7 to 3.5 relative to S. This doubles climb PI gains with the other settings fixed. Native AUTO trials improved gusty altitude tracking with more throttle/rate activity. |
| **C — combined candidate** | Both L and V changes. The published studies have not yet established combined performance. Complete the combined SITL study before nominating C for flight. |

These rows describe comparison identities, **not complete parameter files to load**. Record a full parameter export for every sortie. Keep feedforward calibration, limits, damping configuration and actuator mapping explicit. Simulator trim values and performance limits must not silently replace flight-derived values.

Before flying any new controller, rehearse its exact firmware, parameters, mode transitions and mission in native SITL. Review calm-air, gust and crosswind cases, both turn directions, actuator limits and oscillation. Include the retained alternative stiffness profile and plausible brake-trim/authority and propulsion-response variations. Select a candidate because the tracking/effort tradeoff is acceptable across those cases; a completed AUTO mission alone is insufficient.

**Do not fly the deliberately bad damper sign as a comparison.** Its excitation mechanism can be investigated in simulation. A new filtered damper is a separate experimental change and should first be evaluated with the other controller changes held fixed.

## Ground and logging check

- [ ] Weigh the complete flying assembly. Photograph ballast placement and record any rigging adjustment; keep the rigging unchanged during a comparison pair.
- [ ] Record each brake's actual released position, PWM minimum/maximum/reversal and measured pull over the configured range. Check for slack, preload, binding and capstan slip. A 55 mm drum does not by itself establish brake travel.
- [ ] Verify control direction and takeover behavior with the propeller removed for actuator checks. Confirm that takeover avoids the experimental control path as intended.
- [ ] Check the repaired avionics power-input capacitor and compare current/voltage indications with a credible ground reference. Hood River's bad current signal produced false power limiting; a recurrence invalidates propulsion comparisons.
- [ ] Save firmware identity, complete parameters, mission, sensor calibration state and failsafe settings. Confirm SD logging and available storage.
- [ ] Inspect a short sample log before launch: attitude, body rates, actuator PWM, altitude/vertical velocity, GPS velocity, battery data, modes and controller diagnostics must actually be present.
- [ ] Record synchronized video if practical. Include launch, canopy behavior and unusual events; onboard attitude measures the payload, not the wing.
- [ ] Agree on maneuver callouts and event timestamps. Label failed tosses separately from sustained flight. Use the launch technique established during the earlier tests.

### Required data products

Keep the complete onboard BIN and ground telemetry recording, plus preflight/postflight parameter exports. Preserve native-rate data for dynamics analysis; a 5 Hz overview is not sufficient for the roughly 2.5–4 Hz modeled modes. Aim for at least 25 Hz attitude/body-rate and actuator records, preferably 50 Hz where the hardware and logger support it, and verify achieved rates and dropouts rather than assuming a logging setting delivered them.

Log requested and measured heading rate, steering P/I/feedforward/damping terms, throttle request and actual output, altitude/climb demands, measured vertical velocity, saturation and power-limit indications wherever the tested build exposes them. The dedicated steering analysis uses `PGYR.Tgt`; confirm the rest against the actual build's log definitions. If individual terms are unavailable, record that limitation before interpreting a response.

## Maneuver sequence

The durations and increments below are **initial test proposals**, subject to ground review and pilot judgment. The altitude band, recovery margin, battery reserve and maneuver limits on the cover sheet govern every step. Recover and settle between maneuvers. Do not continue simply to complete the table.

| ID | Maneuver and execution | Useful record / decision |
| --- | --- | --- |
| **01 — Establish flight** | Launch, take pilot control, and establish ordinary steady flight. Spend 30–60 s assessing trim, canopy inflation and control response inside the test area. | Stable trim, plausible sensors and actuator headroom. If basic flight is poor, stop the experimental sequence. |
| **02 — Straight baseline** | Record two roughly 20 s straight, steady segments on approximately reciprocal headings, when space allows. Hold controls steady rather than chasing every small motion. | Payload pitch/rate spectrum, speed, climb/sink and baseline brake/throttle activity. Record wind and control mode. |
| **03 — Throttle response** | With the experimental throttle damper off and pilot control of throttle confirmed, start near level-flight trim. Apply a small increase, then return to trim; repeat for a decrease. Begin with about **3 percentage points of throttle command**, held for 5–10 s, followed by at least 15 s of recovery. Repeat each direction twice if conditions permit. | Immediate payload pitch-rate sign, response delay, slower climb response and repeatability. Verify the actual output increment in the log; stick travel is not a calibrated throttle step. Reduce or end the input if limits approach. |
| **04 — Steady performance** | At pilot-selected moderate power levels, record 15–20 s settled segments around level flight, a gentle climb and a controlled descent. Include a brief low-power glide only if recovery height and conditions allow. | Local throttle/climb map and available ordinary performance. Record bank, heading, voltage and actual throttle; these are not maximum-climb or maximum-sink tests. |
| **05 — Sustained turns** | Begin with broad, moderate turns. Record a left and right turn at similar speed and power, aiming for a full circle only when the available area permits. Return to straight flight between them. Start from the previously demonstrated broad-radius regime; do not begin with a 30 m loiter demand. | Achieved heading rate, ground-track radius, pitch, altitude loss, brake asymmetry and any extra throttle needed to sustain the turn. Separate entry, settled turn and exit. |
| **06 — Controller entry** | For an approved new configuration, engage it on an already steady straight leg with no simultaneous altitude change. Observe at least 20 s before adding another demand. | Mode-transfer transient, trim acquisition, oscillation and command headroom. Take over if behavior deteriorates. |
| **07 — Altitude tracking** | On a straight leg, command a gentle **+3 m altitude change** using the tested mission/reference smoothing, allow it to settle, then return to the original altitude. Repeat only after a clean response. | Actual reference trajectory, climb response, overshoot, settling, payload pitch and throttle effort. Leave climb/sink limits at the approved settings. |
| **08 — Route and loiter** | Fly a short prechecked AUTO route with a broad loiter in each direction at constant altitude. Add no altitude changes inside the first loiters. | Combined path/height tracking, sustained-turn capability and actuator activity. This follows successful straight-leg and altitude tests. |
| **09 — Closeout baseline** | Repeat one straight steady segment, then land with the prebriefed reserve. | Detect voltage, weather or trim drift across the sortie. Save logs before changing settings. |

For a first outing, prioritize 01–05 and 09. Items 06–08 belong to a controller-evaluation sortie after its configuration has cleared the simulation and ground checks. The original flight-tested aircraft is already capable of autonomous missions; this separation is about evaluating the new design without mixing several changes at once.

## Stop a maneuver or end the sortie

**Take over promptly** if oscillations grow over successive cycles, the canopy becomes unstable, commands persist at a limit, the aircraft cannot hold the required recovery margin, or response is inconsistent with the input. Also stop for unexpected mode changes, estimator warnings, implausible power readings, loss of dependable control/telemetry, traffic, or departure from the agreed test area. A sudden large motion does not need several cycles of observation before intervention.

Use the takeover mode and recovery action verified before launch. Do not debug gains or repeat an unstable maneuver in the air. If the behavior persists under the established pilot-controlled configuration, end the sortie. The pilot's judgment and cover-sheet limits take precedence over any planned duration or repetition.

Do not deliberately seek stronger gusts to improve the dataset. If weather changes materially between comparison runs, mark them as different conditions rather than attributing the difference to the controller.

## Comparison discipline

Use separate, labeled sorties for configuration changes, with a full parameter export each time. Once the dedicated-controller baseline is acceptable, compare one change at a time: S versus L for steering, S versus V for altitude, then the combined C if justified. Do not require the whole matrix in one day. An A–B–A repeat is useful when batteries, weather and time permit, but it is optional.

Record mass, rigging, battery voltage and wind for every pair. Compare left and right turns separately. Use comparable maneuver windows and demand amplitudes; do not compare a gentle baseline with a tighter candidate mission. A change in firmware architecture must be labeled as such, rather than presented as evidence for one gain or filter.

## Postflight analysis and exit decision

Before tuning the simulator, freeze its preflight configuration and save predictions for the planned maneuvers. Then replay measured actuator inputs using the actual flight configuration. Preserve the unmodified prediction as the reference so an improved fit is not mistaken for an independent validation.

| Question | Plot / analysis to produce |
| --- | --- |
| Does added throttle initially pitch the payload down? | Align repeated measured throttle changes; overlay body pitch rate, payload pitch, vertical velocity and altitude. Show individual runs as well as any average. Separate the immediate rotation from the slower climb. |
| Is the steady propulsion map useful? | Throttle versus climb/sink in settled segments, annotated with voltage, speed and bank. Compare with the preflight model at the measured mass. Exclude bad power data and actuator-limited windows. |
| Are ordinary turns achievable? | Separate left/right plots of brake command, heading rate, bank, altitude and throttle; show the ground tracks and wind estimate. Ground-track radius is not air-relative turn radius in wind. |
| Is the controller quieter without losing tracking? | Requested versus measured heading rate and altitude; RMS error, brake/throttle activity, saturation time and transfer transients. Inspect time histories alongside spectra. |
| Is the damping model credible? | Pitch/body-rate spectra and recovery envelopes in comparable segments. Payload IMU data alone cannot identify canopy attitude, joint stiffness and damping uniquely. |

The sortie is useful when we have interpretable input/output data from ordinary flight, even if the new controller is not flown. The phase can advance when the candidate completes the ordinary route with acceptable pilot handling, no growing oscillation, sufficient actuator/recovery margin, and a clear account of tracking versus control effort. Choose those operational limits before flight; do not manufacture a pass by moving them afterward.

If repeatable response disagrees with the model, identify which feature is wrong—initial sign, delay, steady gain, oscillation frequency or turn authority—and change that part with a documented physical rationale. If the model predicts the main responses and the controller behaves well, proceed to a broader operating envelope rather than another unconstrained tuning sweep.

## Event notes

| Time / log marker | Maneuver | Configuration | Observation / reason stopped |
| --- | --- | --- | --- |
| __________ | __________ | __________ | __________ |
| __________ | __________ | __________ | __________ |
| __________ | __________ | __________ | __________ |

Keep raw logs in Mission Planner. Publish the final plots, analysis scripts and configuration provenance in the tinkering repository, following the existing [data and methods](data-and-methods.md) convention.
