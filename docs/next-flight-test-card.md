# Micro-AGU: Next Flight Test Card

[Build](micro-agu-design.md) · [Flight history](flight-testing.md) · [Controller design](controller-design.md) · [Data and methods](data-and-methods.md) · [Rigging and wider-spreader study](rigging-refinement.md)

**Phase 3 · Rigging validation and staged controller evaluation · Revision 3 · 185 mm spreader and routed-brake study**

The next flight introduces the planned 185 mm riser-spacing configuration, with the existing 91 mm brake guides and lines re-trimmed under load. Establish that hardware with one frozen controller before evaluating software changes. Measure ordinary up-and-away behavior: throttle-to-climb response, payload pitch motion, and sustained turns in both directions. Those measurements will tell us whether the flight-informed simulator is useful for choosing controller settings. Reproducing the powered, high-bank Hood River turn is outside this card. An optional landing-development extension adds symmetric-brake measurements and approach rehearsals at recovery altitude; automatic flare and touchdown remain a later phase.

This is a published test plan, not a record of a completed test or a released flight configuration. The sequence below is a menu for several short sorties; completing every item in one flight is not the objective. **The minimum useful sortie is the documented H1 ground setup, a stable airborne baseline, repeatable small throttle changes, and one ordinary turn in each direction.**

## Test-day cover sheet

Fill these fields before launch. The pilot sets the operating limits for the actual field and conditions; the simulation's altitude and wind settings are not flight limits.

| Item | Record before launch |
| --- | --- |
| Date, site, pilot and observer | __________ |
| Sortie / configuration ID | __________ |
| Firmware commit and build identifier | __________ |
| Saved parameter file and mission file | __________ |
| All-up mass, battery and ballast | __________ |
| Spreader configuration / actual loaded riser spacing / guide spacing | __________ |
| Loaded ring distance and contact location, left/right | __________ |
| Left/right brake zero, slack, line lengths and servo mapping | __________ |
| Ground pitch/roll sweep and inflated-canopy photo IDs | __________ |
| Hardware / software comparison identity (H0/H1 + F/S/T) | __________ |
| Mean wind, direction and gust range | __________ |
| Working altitude band and minimum recovery altitude | __________ |
| Test-area boundary and landing area | __________ |
| Maximum permitted bank, turn rate and climb/sink rate | __________ |
| Battery voltage/capacity landing reserve | __________ |
| Tested pilot takeover mode and switch | __________ |
| Next maneuver and its prebriefed input limit | __________ |

**Historical comparison:** Trout Lake's ballasted configuration was 1.758 kg; the unballasted configuration was 1.385 kg. The reported battery was 6S, 6 Ah total. These are reference values, not substitutes for weighing and checking the next aircraft. The reported propulsion was an FFTY 900 KV motor and 9×4.5 pusher propeller, clockwise viewed from behind.

## Hardware setup and a ground test of brake coupling

**H0** identifies the existing 132 mm slot-center rig. **H1** identifies the planned `HK-estimate-185mm` configuration in `SpreaderBarSpar.SLDPRT`. The saved H1 sketch has `D2@Sketch1 = 173 mm`, giving 185 mm slot centers with 12 mm slots. Brake guides remain 91 mm apart. The CAD rebuild passed; printing, assembly selection, physical clearance and loaded trim are still test-day checks. Do not infer that the aircraft has already been modified from the saved configuration.

1. Record the installed part/configuration and measure loaded strap spacing. Reweigh the aircraft and record CG/ballast. Photograph left/right slots, white straps, ring contact, and the full servo → guide → D-ring → brake cascade route.
2. With the propeller removed, support and tension the rig appropriately, fix both servos at the intended neutral, and establish brake slack/engagement separately on each side. Re-tie for the new geometry; do not blindly copy the old knots or add an assumed length from the simulation.
3. Record a gentle, repeatable relative pitch sweep around neutral (target ±10° initially, only if the setup permits it without binding), then a small roll sweep. Measure left/right line travel or engagement at each pose. Compare common and differential changes. Photograph the ring as it follows the strap; measure distance along the loaded riser rather than from an unloaded hanging strap.
4. Check routing clearance, friction, return to neutral and full commanded servo travel, including motor/shroud clearance. Stop the ground test if a line catches or trim does not return. Moving the guide holes is a separate hardware revision and would require repeating this check.
5. Obtain a front view of the inflated canopy, with a scale reference and the riser attachment locations visible when practical. Archive original images. A single oblique image cannot identify projected span, incidence and line lengths independently.

Use **H1+F** for the first hardware characterization where the recovered F build is compatible and ground-checked. If it is not, nominate and freeze another already-qualified configuration explicitly; do not substitute an untested controller silently. Compare H0/H1 only if a practical matched sortie is available. Otherwise label the old-flight comparison as confounded by conditions and setup. Keep the installed hardware fixed during later S/T software comparisons.

The model predicts a small mechanical-only width effect and potentially much larger canopy/trim effects. The purpose of this ground work and first sortie is to distinguish those explanations, not confirm an assumed improvement.

## Configuration decision before flight

The flight-tested Trout Lake controller and the dedicated simulation-development controller are different implementations. Switching between them is not necessarily a gain change or a flight-mode change. Verify the actual firmware behavior, and use separate sorties/builds when needed. Do not assume a switch restores the old controller.

| Configuration | Evidence and purpose |
| --- | --- |
| **F — flight baseline** | Recovered Trout Lake flight-tested configuration, including the damper being disabled. Reconfirm hardware compatibility and exact settings before using it. Establish ordinary aircraft response. |
| **S — current development baseline** | Dedicated heading-rate control; steering P/I 0.005/0.002, roll damping 0.003, 1 Hz steering filter, pitch damping 0.1 with two 1.5 Hz stages, and `TECS_VERT_ACC = 3.5`. This supersedes the historical 4 Hz / 7 baseline. These are identifiers, not a complete upload file. |
| **T — retuned conventional candidate** | The eight-setting candidate in the state-space article: steering P/I 0.00278/0.00169, roll damping 0.00106, steering filter 0.762 Hz, pitch damping 0.0971, each pitch-filter stage 1.106 Hz, nominal-voltage climb P 0.0435, height feedback 0.0787 s⁻¹. Existing native calm/gust trials passed, with tradeoffs; repeat on the exact intended build and new rigging profiles before flight. |
| **R — simulation research only** | `routed_research` / `wide_research` plant profiles, including the 2.5× exploratory pitch/yaw joint damping. These are aircraft-model coefficients, not controller gains to upload. Scheduled state feedback/LQI also remains simulation research and is not a flight option on this card. |

These rows describe comparison identities, **not complete parameter files to load**. Record a full parameter export for every sortie. Keep feedforward calibration, limits, damping configuration and actuator mapping explicit. Simulator trim values and performance limits must not silently replace flight-derived values.

Before flying any new controller, rehearse its exact firmware, parameters, mode transitions and mission in native SITL. Review calm-air, gust and crosswind cases, both turn directions, actuator limits and oscillation. Include the retained alternative stiffness profile, `routed_research` and `wide_research`, plus canopy-flattening sensitivities, brake-trim/authority and propulsion-response variations. The new routing profiles have passed numerical/backend checks; full native mission regression on them is a prerequisite for a new controller flight, not a result claimed by the rigging study. Select a candidate because the tracking/effort tradeoff is acceptable across those cases; a completed AUTO mission alone is insufficient.

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

For the first H1 outing, prioritize 01–05 and 09 after the loaded-routing ground check. Repeat turns at comparable power in both directions and retain synchronized canopy video if available. The simulator’s 5 mm brake pulse is an analysis input, not a new automatic flight-test command; start with the previously demonstrated broad-turn regime. Items 06–08 belong to a controller-evaluation sortie after its configuration has cleared the simulation and ground checks. The original flight-tested aircraft is already capable of autonomous missions; this separation is about evaluating the new design without mixing several changes at once.

## Landing-development extension

**Purpose:** measure the approach and symmetric-brake response needed to develop landing and flare control. This extension follows a successful baseline sortie. Automatic flare, intentional stall, collapse testing and automatic touchdown are outside this phase. Keep the new landing experiments separate from first trials of the replacement up-and-away controller.

The existing simulator supports airborne approach work, but its rigid, inflated canopy and taut suspension do not establish large-brake, stall or touchdown behavior. Use these measurements to improve that model before selecting an automatic flare law.

### Additional cover-sheet entries and ground checks

| Item | Record before this extension |
| --- | --- |
| Symmetric-brake command path, firmware and tested release action | __________ |
| Left/right released reference and pull-versus-PWM calibration, mm | __________ |
| Initial common-pull increment, ramp rate, hold time and maximum tested pull | __________ |
| Differential steering authority retained at that common pull | __________ |
| Recovery altitude floor and approach-rehearsal termination altitude | __________ |
| Fixed throttle setting / controller modes for each brake-response run | __________ |
| Height sensor, mounting, valid range, quality flag and log fields, if fitted | __________ |

- [ ] Confirm that this firmware actually provides an independently controllable common-brake input. Do not assume the existing differential steering mixer supports it. If it does not, defer airborne brake tests until that input, its bounds and the pilot override have been implemented and bench/SITL checked.
- [ ] With the propeller removed, check common and differential commands together across the proposed test range. Verify release, clipping, remaining steering travel and takeover. Equal PWM increments are not equal line pull on the asymmetric servos; define the common input as equal additional pull from each side's measured trim reference.
- [ ] Begin with the mechanically established inflation/glide trim described in the [flight story](flight-testing.md#finding-trim-with-the-power-off). Record any change to knots, slack or rigging; do not change them between comparison runs.
- [ ] Choose a small initial pull, ramp and duration from ground checks and simulation review; fill them in above before launch. Servo hard travel is not an aerodynamic brake limit. Do not use the full-brake ground inflation check as an airborne command.
- [ ] If a downward rangefinder is installed, check known heights over representative surfaces and several payload attitudes. Verify distance, signal validity and timestamps. Record the sensor's position and pointing direction relative to the payload; a slant-range reading is not automatically vertical height above ground.

### Additional maneuvers

Perform these on a dedicated sortie or after the baseline measurements, with adequate reserve, before closeout item 09. An unsuccessful or unavailable sensor test does not prevent collecting useful high-altitude brake-response data.

| ID | Maneuver and execution | Useful record / decision |
| --- | --- | --- |
| **LD-01 — Unbraked glide reference** | At recovery altitude, establish a straight, settled low-power glide with the brakes at the established released references. Use a known, fixed throttle setting; log any pilot corrections. Repeat on a comparable heading if conditions allow. | Baseline sink, ground velocity, payload attitude/rates and actual brake outputs. Establish the reference before adding common braking. |
| **LD-02 — Small symmetric-brake response** | From the same settled condition, apply the prebriefed small common-pull ramp, hold only for the prebriefed interval, then return using the tested release action. Recover and settle fully before repeating. Keep throttle fixed during the measurement unless recovery requires intervention; avoid altitude hold adding power and masking the response. | Initial pitch response, change in descent rate and speed proxy, response delay, and motion during release. Mark every recovery intervention. Repeat the smallest input before considering a larger one; review its data on the ground before expanding the range. |
| **LD-03 — Steering with common brake** | Only after LD-02 is repeatable, apply a small differential correction in each direction at an already evaluated common-brake setting. Keep the maneuver within the ordinary turning envelope and return to trim between trials. | Remaining steering authority, left/right asymmetry and mixer clipping. Defer if common braking gives poor canopy behavior or insufficient control margin. |
| **LD-04 — Approach rehearsal aloft** | Fly a straight into-wind descending leg representing a final approach, using a virtual landing plane well above the actual ground. Terminate at the prebriefed altitude and recover with the established pilot-controlled procedure. Do not activate a flare or ground-contact state. | Glide-path tracking, throttle demand, path repeatability and recovery transient. Any automated approach logic must first be exercised with its exact mission and abort path in SITL. |
| **LD-05 — Height-sensing observation** | If fitted, record rangefinder data when ordinary pilot-controlled flight or landing naturally enters its valid range. Do not descend solely to acquire readings. Use synchronized video and ground reference measurements where practical. | Dropouts, surface dependence, attitude sensitivity, latency and consistency with independent observations. These data inform a later flare-entry estimate; they do not authorize automatic flare. |

Stop a brake maneuver immediately for unexpected roll/yaw, rapid sink increase, loss of canopy shape, growing pitch motion, poor steering response or exhausted actuator margin. Use the pretested release/takeover action and recover; do not increase braking to rescue an unfamiliar response. If there is no dependable recovery response, end the extension and land using the established procedure.

### Logging and analysis for landing development

Record common and differential brake requests, actual left/right PWM, mixer limit flags where available, throttle request/output, mode, payload attitude/body rates, altitude, vertical velocity, GPS velocity and battery voltage. Record measured airspeed if available; otherwise label ground speed as ground speed and retain the wind uncertainty. Do not infer a stall speed or a lift/drag polar from GPS speed alone. For a rangefinder, include raw range, validity/quality and sample times alongside the estimator's height output.

Produce aligned plots of each brake ramp and release: inferred left/right line pull, common/differential input, throttle, pitch/rates, vertical velocity and speed. Distinguish line pull inferred from the bench calibration from travel measured in flight. Compare repeat runs and show the recovery interval, not just the momentary reduction in sink. A short reduction in descent rate can consume speed; it does not establish a sustainable glide improvement or a successful flare.

The deliverable is a first measured small-brake response, its repeatability and steering margin, an approach-rehearsal result, and a height-sensing assessment or explicit sensor gap. Use those to set the next model and sensor tasks. Automatic flare trials require a separate card after the flare law, height estimator, mode transitions and recovery behavior have been evaluated together. Touchdown speed and attitude predictions remain unvalidated until ground-contact behavior is addressed.

## Stop a maneuver or end the sortie

**Take over promptly** if oscillations grow over successive cycles, the canopy becomes unstable, commands persist at a limit, the aircraft cannot hold the required recovery margin, or response is inconsistent with the input. Also stop for unexpected mode changes, estimator warnings, implausible power readings, loss of dependable control/telemetry, traffic, or departure from the agreed test area. A sudden large motion does not need several cycles of observation before intervention.

Use the takeover mode and recovery action verified before launch. Do not debug gains or repeat an unstable maneuver in the air. If the behavior persists under the established pilot-controlled configuration, end the sortie. The pilot's judgment and cover-sheet limits take precedence over any planned duration or repetition.

Do not deliberately seek stronger gusts to improve the dataset. If weather changes materially between comparison runs, mark them as different conditions rather than attributing the difference to the controller.

## Comparison discipline

Use separate, labeled sorties for configuration changes, with a full parameter export each time. Once the hardware and dedicated-controller baseline are acceptable, compare S versus T as the declared eight-setting package on the same installed rig. If individual settings are isolated later, give those configurations new identifiers and export their complete parameters. Do not require the whole matrix in one day. An A–B–A repeat is useful when batteries, weather and time permit, but it is optional.

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

## Post-flight model update for the new rigging

Archive the exact firmware/parameter files, hardware/configuration ID, loaded-rigging photos, measured mass/CG, neutral settings and complete BIN log together. Keep the raw servo outputs, battery voltage, IMU rates and navigation streams. Mark maneuver times and camera synchronization. Record whether any software change occurred between sorties.

First replace the assumed ring contact and brake zeros with measured geometry, then replay the new flight without tuning on the comparison windows. Compare the old model, routed 132 mm model and measured H1 model using the same initialization and wind estimate. Evaluate both turn directions, pitch-rate response, climb and brake activity separately. Only then refit on a declared subset and reserve other windows for checking. A better aggregate score alone does not identify ring height, canopy incidence or damping.

The 185 mm/flattening predictions and the controller candidates remain hypotheses until those measurements exist. A successful hardware sortie does not validate the 2.5× damping fit or authorize automatic landing/flare development.
