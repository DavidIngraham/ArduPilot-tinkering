# Micro-AGU: Data and Methods

[Flight story](flight-testing.md) · [Design](micro-agu-design.md) · [Steering](paraglider.md) · [Throttle and pitch](longitudinal-observer.md)

This appendix supports the four project chapters. Flight measurements, the initial simulation tuning, and later controller/model experiments are separate evidence sets.

## Design record

The design record includes pages 1, 185, and 323 of `Paraglider.pdf`, SolidWorks files, build photographs, and flight logs. The [design evidence](assets/micro-agu/design-evidence.json) records assembly structure and source hashes. CAD previews were extracted with [SWFormat](https://github.com/KenM76/swformat).

## Flight measurements

The figures use the January 3 and February 15 onboard logs. Height is relative to home, and the ground track is relative to the plotted segment’s starting point. Energy is battery-side electrical energy, calculated from current and voltage and checked against the onboard counters. The AUTO endurance row is part of the full Trout Lake flight.

The force diagram explains the mechanism identified afterward in the articulated model; loaded CG and inertia remain to be measured. The February 15 firmware reports `3a2da6cf`, while its parameter names match later source changes. The inspected implementations agree on the damper sign, but the version string does not identify the exact compiled tree. Filter behavior also matters: the inspected code zeros the signal at zero cutoff, applies positive cutoff changes on reset, and updates at 50 Hz using the throttle-loop timestep.

I reviewed six onboard logs and 54 telemetry logs with their raw companions. A February 22 telemetry recording switches from hardware to SITL; that simulated section is excluded here. The [flight evidence](assets/flight-testing/flight-evidence.json) records source hashes and comparison windows. [Hood River](assets/flight-testing/hood-river-plot-data.csv.gz) and [Trout Lake](assets/flight-testing/trout-lake-plot-data.csv.gz) overview data are sampled at 5 Hz; pitch-rate comparisons use the 25 Hz analysis.

The simulation figures use the Mission Planner SITL recording beginning February 14 at 13:43:43 PST, which continues into February 15. It is kept separate from the aircraft flight data. Recorded parameter values and timestamps are preserved in the [simulation tuning history](assets/flight-testing/sitl-lateral-tuning-history.json).


The [endurance evidence](assets/flight-testing/endurance-evidence.json) specifies energy and capacity windows. The pilot confirmed 6 Ah total capacity, accurate Trout Lake capacity estimates, an unchanged configuration during the long flight, and landing because testing was complete.

### Longitudinal reconstruction

Local throttle–climb fits use non-overlapping 10 s windows, MANUAL or FBWA throughout, throttle standard deviation below 1.5 percentage points, and finite EKF climb data. Climb is negative EKF down velocity, checked against height slope. Turns and vertical air motion remain in the samples. Adjacent windows are not independent repetitions; these are local steady-response fits rather than dynamic transfer functions or extrapolations to idle/full throttle.

Hood River supplied 20 windows: climb ≈ 0.05097 × throttle[%] − 1.809 (R² 0.85). Early Trout Lake supplied 13: climb ≈ 0.06257 × throttle[%] − 2.673 (R² 0.88). The pilot confirmed that the 1.8 m/s climb and 3 m/s sink settings came from Hood River analysis. The selected steady windows do not reproduce those original limit measurements.

- [Longitudinal parameter ledger](assets/flight-testing/longitudinal-parameter-ledger.csv)
- [Hood River fit inputs](assets/flight-testing/2026-01-03-steady-fit.json)
- [Trout Lake fit inputs](assets/flight-testing/2026-02-15-steady-fit.json)

### Lateral flight measurements

The long Trout Lake log contains no roll-gain changes. Loiter radius changed 60 → 40 m at boot 828.69 s in LOITER, then 40 → 30 m at 2349.57 s in GUIDED. The pilot confirmed deliberate tighter-turn testing; the second parameter edit alone does not establish a completed 30 m circle.

Heading rate uses unwrapped ATT.Yaw with a symmetric 2 s difference, not body yaw gyro or ground-course rate. Bank tracking uses CTUN.NavRoll minus CTUN.Roll; cross-track error uses NTUN.XT. The plotted manual interval is shaded. Selected settled windows were 780–825 s (60 m), 850–900 s and 950–1045 s (40 m). These windows do not compare different controller gains.

- [Lateral parameter ledger](assets/flight-testing/lateral-parameter-ledger.csv)
- [Response windows and statistics](assets/flight-testing/lateral-response.json)

## Lateral-controller evidence

The controller sketch is from page 323 of my notebook. The Hood River parameter values come from the January 3 onboard log. The algebra follows [`AP_RollController::get_servo_out`](https://github.com/DavidIngraham/ardupilot/blob/0f1121f32035d218c624fa7e110a124fd7fc6263/libraries/APM_Control/AP_RollController.cpp), [`AP_FW_Controller::_get_rate_out`](https://github.com/DavidIngraham/ardupilot/blob/0f1121f32035d218c624fa7e110a124fd7fc6263/libraries/APM_Control/AP_FW_Controller.cpp), and [`AC_PID`](https://github.com/DavidIngraham/ardupilot/blob/0f1121f32035d218c624fa7e110a124fd7fc6263/libraries/AC_PID/AC_PID.cpp) at the revision reported by that log. The numerical example holds speed scaling constant and stays below output limits.

The gains we selected for this SITL model are `PG_TURN_RMAX=25`, `FF=0.051`, `P=0.04`, `I=0.002`, `IMAX=0.15`, `ACCEL=40`, `FILT=4`, `TC=0.1`, `ASPD=5`, `RDAMP=0.03`, `D_FF=0.02`. They accompany `NAVL1_PERIOD=8`, `NAVL1_DAMPING=1`, `WP_RADIUS=22` and `WP_LOITER_RAD=25`. These are model-specific engineering selections, not general flight recommendations.


### Recorded initial simulation tuning

The February 14 Mission Planner log extends into February 15. Wall-clock timestamps are PST; the overnight span is recording coverage, not continuous active tuning. Parameter histories are recorded values, which can include reloads or automated changes as well as manual edits.

The two AUTO close-ups start at 11:30:00 and 11:35:15 on February 15 and last 45 seconds. They use ATTITUDE.roll and NAV_CONTROLLER_OUTPUT.nav_roll/xtrack_error. They have different navigation demand histories. FF and D_FF differ, so the plots illustrate recorded behavior without isolating a single gain's causal effect. The overview retains mode changes and the surrounding runs.

- [Tuning history](assets/flight-testing/sitl-lateral-tuning-history.json)
- [Comparison windows](assets/flight-testing/sitl-tracking-windows.json)

### Later model assumptions

When the simulated yaw response oscillated, I wanted to understand whether additional damping could be explained by a higher-fidelity model. Without flight data to identify it, we chose a provisional damping term and added propeller torque reaction. The canopy model builds on [Umenberger and Göktogan, ACRA 2012](https://www.araa.asn.au/acra/acra2012/papers/pap151.pdf). Added yaw damping (`Cnr=-0.05`) is an effective provisional term, and propeller torque reaction uses a provisional −0.02 m torque/thrust ratio. Neither is identified from flight logs. Higher-fidelity canopy/payload coupling can contribute apparent damping, but does not establish these numerical values.

## Can the launch start in the right physical state?

My actual launch starts with both payload and canopy upside down. I hold the bottom of the payload, lay the canopy out in a crescent, swing it overhead in about a second, walk two steps once it is inflated, and give it a light toss. I let it glide for about a second before throttling up. I wanted that sequence represented because the release state could matter to the oscillations we were trying to control.

We explored that sequence with provisional geometry and timing. A 1.0 s swing looked more promising than 0.8 or 1.2 s for release orientation, but about 39% of the held trajectory required compression in the assumed suspension constraint. That invalidates a taut-line rigid interpretation of actual inflation. This is a design study, not a validated launch simulation.

![Inverted swing study](../scratch/paraglider-tests/pitch-joint/swing-launch/inverted-launch.png)

The durable SITL throw guide is a synthetic initialization aid; it does not implement the overhead inflation sequence. The model assumes an inflated canopy and does not simulate slack lines, inflation or collapse. [Swing results](../scratch/paraglider-tests/pitch-joint/swing-launch/inverted-results.json) retain the checks and assumptions.


## Reproducing the figures

The [simulation extraction](assets/flight-testing/analysis/extract_sitl_nav.py), [tuning overview](assets/flight-testing/analysis/plot_sitl_tuning.py), [tracking comparison](assets/flight-testing/analysis/plot_sitl_tracking.py), [lateral flight analysis](assets/flight-testing/analysis/lateral_sysid.py), and [longitudinal fits](assets/flight-testing/analysis/system_id_fit.py) preserve the analysis behind the new figures. They expect the original local log tree and previously extracted JSON/NPZ data; paths need adjustment on another machine. Raw aircraft and telemetry logs are not bundled here. The repository [archive instructions](../README.md#archive-and-restore) describe the separately retained historical simulation scripts, compressed artifacts, hashes, and omitted files.
