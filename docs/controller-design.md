# Designing the Micro-AGU Flight Controller

*Micro-AGU · [Build](micro-agu-design.md) · [Flight tests](flight-testing.md) · [Controller design](controller-design.md) · [Data and methods](data-and-methods.md)*

The controller has two jobs: turn the aircraft along its route and use throttle to follow the requested altitude. Both jobs act on the same suspended system. A brake correction can excite payload pitch, and a throttle correction changes the motion seen by the steering loop. The design uses feedforward for the expected effort, modest feedback for tracking, and separate damping paths shaped around the coupled modes.

The first flights established a useful starting point. The [original lateral controller](paraglider.md) adapted ArduPlane's roll loop through its gains. The [original longitudinal controller](longitudinal-observer.md) adapted TECS to throttle-only altitude control and exposed the pitch-damper sign problem. This article describes the controller developed afterward: its architecture, the classical analysis behind its tuning, and its behavior in the 9-DOF simulator.

## One aircraft, two control paths

Navigation supplies a turn request and an altitude trajectory. Differential brake pull controls turning; throttle controls climb and descent. Symmetric braking is reserved for future landing work, rather than acting as an elevator during normal flight.

The analysis uses the 1.758 kg Trout Lake configuration, asymmetric brake trim, and modeled 9×4.5 pusher propulsion. Canopy and payload have separate attitudes. Rotor dynamics and active steering remain in the longitudinal plant.

Nine mechanical degrees of freedom do not mean nine linear states. The local plant uses 15 perturbation states after removing absolute position and arbitrary heading, including rotor RPM. Steering filters and integration add three states; altitude, climb integration, pitch filters and reference smoothing add five more to the full longitudinal model.

## Steering: track turn rate, damp roll separately

![Heading-rate controller with separate feedforward, PI correction and roll-rate damping](assets/control-loops/current-lateral.png)

Feedforward supplies the expected differential-brake input. Heading-rate PI corrects tracking and asymmetric trim, while payload roll-rate feedback damps rocking. These paths have different jobs and independently adjustable gains.

Navigation's bank-encoded request is converted into heading rate, limited to ±25°/s, smoothed with a 0.1 s time constant, and limited to 40°/s² acceleration.

~~~text
heading_rate = (q sinφ + r cosφ) / cosθ
e = shaped_target − filtered_heading_rate
Sᵥ = clamp(5 / max(Vair, 2), 0.25, 2.5)

u_brake = clip[Sᵥ(0.009 target + 0.005 e − 0.003 filtered_p) + I, −1, +1]
İ = 0.002 e, with |I| ≤ 0.15 and conditional integration
~~~

Here p is body roll rate, q body pitch rate and r body yaw rate; controller rates are in degrees per second. Body roll rate only approximates the Euler bank-angle derivative near level attitude. The brake mixer maps the normalized output to the actual servo ranges.

The small P gain is deliberate. Large heading-rate feedback excited the payload instead of simply making turns more accurate. Feedforward carries most of the steady demand; feedback corrects the residual.

The [lateral frequency analysis](data-and-methods.md#classical-lateral-analysis-and-frequency-shaping) identified a lightly damped coupled mode near 2.54 Hz. A separate six-run native experiment found that reducing the lateral measurement filter from 4 to 1 Hz reduced rapid brake activity, with mixed gust-rate tracking results. This longitudinal optimization holds steering at the tested 4 Hz baseline. Combining the lateral candidate with new longitudinal tuning remains a separate comparison.

## Altitude: keep TECS's framework, use throttle as the actuator

![Standard TECS architecture](assets/control-loops/tecs-standard.png)

Standard TECS coordinates total energy and its distribution between height and airspeed using throttle and pitch demand. This parafoil has no elevator-like pitch actuator. Continuous symmetric braking would cost efficiency and wing stability. The adaptation treats airspeed as approximately trimmed and controls vertical speed through throttle.

![Parafoil altitude controller](assets/control-loops/tecs-parafoil.png)

The outer loop adds an altitude-error correction to the altitude trajectory's rate of change:

![Requested climb rate equals trajectory rate plus altitude error divided by the height time constant](assets/control-loops/tecs-height.png)

The climb demand is bounded. Throttle feedforward estimates the required power, PI feedback corrects climb-rate error, and filtered payload pitch rate supplies a separate damping correction:

![Throttle law with feedforward, proportional, integral and pitch-rate damping terms](assets/control-loops/tecs-throttle.png)

### Calibrate feedforward before increasing feedback

At 22.2 V, model trim requires about 44.6% throttle for level flight and 59.9% for a 1 m/s climb. Development settings use 45% trim, 60% maximum throttle, a 1 m/s climb calibration and a 2.5 m/s descent calibration. These calibrate the simulator's local throttle map; they do not replace flight-derived performance estimates.

~~~text
Climb:   u_FF = trim + (v_cmd / climb_limit) × (maximum − trim)
Descent: u_FF = trim + (v_cmd / sink_limit) × (trim − minimum)
~~~

ArduPlane's existing battery compensation scales output as voltage falls. The analysis includes that scaling and the compensated throttle limit returned to TECS. The integrator should not have to compensate for a battery path that was accidentally disabled.

A 0.5 s first-order filter smooths the trajectory derivative used for feedforward. Height feedback and climb/sink limits remain intact. This prevents abrupt altitude capture from becoming a throttle kick.

### Shape damping around the modes

The original ACRA-inspired damper assumed that adding throttle would oppose a nose-down rotation. Thrust above the payload CG initially pitches this payload down. A fast minus-sign damper can reinforce the motion it is intended to suppress.

<video controls muted loop playsinline preload="metadata" poster="assets/viewer/pitch-fbd/pitch-fbd.jpg"><source src="assets/viewer/pitch-fbd/pitch-fbd.mp4" type="video/mp4"></video>

*Left: the original locked-relative-pitch picture. Right: the independently pitching payload. This is a conceptual animation with the CAD carriage, not a simulated trajectory or a depiction of the ACRA aircraft's construction.*

Reversing the sign suppresses the fast response but can excite slower motion. The selected damper retains negative pitch-rate feedback and shapes its frequency response with two 1.5 Hz first-order low-pass stages:

![Pitch damping uses gain −0.1 and two cascaded 1.5 Hz filters](assets/control-loops/tecs-damper.png)

The combined filter reaches −3 dB near 0.97 Hz. Washout is disabled. The correction is bounded to ±0.25 throttle fraction before final throttle limits. This is a frequency-dependent design choice, not a claim that the original fast feedback was correct.

## The classical analysis that sets the tuning

The full-loop analysis keeps the motor, steering feedback, altitude loop, climb PI and pitch-rate filters together. Seven cases span level flight, climb, descent, lower voltage, a softer roll model and both feedforward slopes. Each is checked at three frozen lateral airspeed scales. A further sensitivity check varies the rotor response rate by ±30%.

Transfer functions come from the linearized state-space model. Numerical results retain poles and modal residues rather than expanding an ill-conditioned high-order polynomial:

~~~text
G_v(s) = C_v (sI − A)⁻¹ B       throttle → upward velocity
G_q(s) = C_q (sI − A)⁻¹ B       throttle → payload pitch rate
G(s)   = Σ residue_j / (s − pole_j)
~~~

![Throttle-to-climb and throttle-to-pitch frequency response](assets/longitudinal-final-design/plant-frequency.png)

With steering closed at nominal level trim, important plant modes include:

| Mode | Poles, s⁻¹ | Design implication |
|---|---|---|
| Slow pitch / forward-speed motion | −0.307 ± j2.152 | About 0.34 Hz; sustained gust response |
| Relative-pitch / vertical motion | −0.969 ± j15.978 | About 2.54 Hz; constrains aggressive feedback |
| Relative pitch and body rates | −5.117 ± j25.402 | About 4.04 Hz; gyro motion is not a single mode |
| Rotor response | −56.94 | Motor dynamics remain part of the plant |

These labels describe dominant participating states, not independent subsystems. The model also contains roll/yaw modes and controller-filter poles.

![Annotated plant poles and output-dependent transmission zeros](assets/longitudinal-final-design/plant-poles-zeros.png)

Zeros depend on the controlled output. The payload pitch-rate transfer has a real right-half-plane zero at +1.543 s⁻¹, consistent with its inverse response. With steering closed, the climb transfer includes right-half-plane zero pairs near +0.193 ± j13.086 and +3.014 ± j29.257 s⁻¹. They constrain high-frequency inversion; they do not imply that low-frequency climb has the same initial wrong-way response as payload pitch. A zero describes cancellation among paths, not an extra oscillation mode.

### Optimize the whole loop

The bounded optimization explored three directions: pitch-damper gain and filter shape, climb-rate PI strength, and altitude-loop speed. Ten configurations were screened across the operating cases; useful alternatives then faced matched nonlinear gust histories.

![Full-loop gain and sensitivity comparisons](assets/longitudinal-final-design/loop-frequency.png)

There are several unity-gain crossings. One phase-margin number would hide that structure. The study retains all crossings, examines the Nyquist locus and checks full closed-loop eigenvalues. Sensitivity peaks show where disturbances or model errors can be amplified; they do not replace nonlinear response checks.

![Damper gain root locus](assets/longitudinal-final-design/root-locus.png)

Lowering both pitch-filter cutoffs to 1 Hz improved the worst linear sensitivity peak but produced more pitch motion in both nonlinear gust realizations. Raising them to 2 Hz destabilized two screened cases. Larger damper gains also had an unfavorable motion/effort tradeoff. The pitch settings remain gain 0.1 with two 1.5 Hz stages.

The useful change is stronger climb-rate PI:

~~~text
K_P = positive_throttle_range / (TECS_TIME_CONST × TECS_VERT_ACC)
K_I = TECS_INTEG_GAIN × K_P
~~~

Changing TECS_VERT_ACC from 7 to 3.5 doubles both gains while preserving their ratio. At nominal voltage, K_P becomes 0.03429 throttle fraction per m/s and K_I becomes 0.01029 per metre. This parameter is the gain-scaling denominator in the paraglider path; it is not a newly measured physical acceleration limit.

The outer height time constant remains 10 s, derivative-feedforward smoothing remains 0.5 s, and feedforward calibration is unchanged. Faster altitude feedback improved the small-command tracking score but did not address gust disturbances as directly.

## What the selected tuning achieves

For a 0.1 m altitude ramp over two seconds, linear prediction differs from the nonlinear candidate by about 0.2 mm height RMS and 0.011°/s pitch-rate RMS. The nonlinear diagnostic includes discrete updates and piecewise feedforward, using simulated truth rather than the native estimator.

![Linear predictions and nonlinear small-command response](assets/longitudinal-final-design/full-loop-validation.png)

Matched gust histories show the tradeoff:

| Metric | Original gusts: baseline → selected | Different, 50% stronger gusts: baseline → selected |
|---|---:|---:|
| Height error RMS | 0.404 → 0.365 m | 0.531 → 0.480 m |
| Climb-rate RMS | 0.455 → 0.420 m/s | 0.544 → 0.506 m/s |
| Payload pitch standard deviation | 6.17 → 6.24° | 10.14 → 10.16° |
| Pitch-rate RMS | 18.03 → 18.77°/s | 25.08 → 25.58°/s |
| Throttle standard deviation | 2.65 → 3.07 percentage points | 3.91 → 4.43 percentage points |

The choice prioritizes altitude and climb control while accepting modestly more rate motion and throttle effort. No matched run saturates throttle. This is a useful refinement, not a dramatic change in the forced airframe response.

### Native AUTO verification

The selected configuration passed the existing full AUTO test in calm air and synthetic gusts, including altitude changes, both opposing two-turn loiters, home loiter and controller handover. Recorded parameters confirm that only TECS_VERT_ACC changed from the preceding baseline; the backend reported no errors or clipped packets.

![Native AUTO comparison of baseline and selected climb-rate gains](assets/longitudinal-final-design/native-comparison.png)

| Native result | Baseline → selected |
|---|---:|
| Gusty CW loiter height RMS | 0.408 → 0.375 m |
| Gusty CCW loiter height RMS | 0.435 → 0.379 m |
| Calm CW loiter height RMS | 0.064 → 0.053 m |
| Calm CCW loiter height RMS | 0.080 → 0.089 m |
| Gusty maximum waypoint height error | 2.26 → 2.20 m |
| Calm maximum waypoint height error | 1.71 → 1.66 m |
| Gusty maximum corner overshoot | 1.39 → 1.35 m |
| Calm maximum corner overshoot | 0.36 → 0.63 m |

Settled gusty pitch-rate RMS rises from 19.02 to 20.11°/s clockwise and 18.53 to 20.32°/s counterclockwise. Throttle standard deviation rises from 2.90/2.81 to 3.42/3.42 percentage points. These costs accompany the altitude improvement.

The baseline is the archived passing two-stage-damper run; the candidate uses the same route, model and gust generator. Arrival times differ, so the loiters encounter different gust phases. The matched nonlinear histories isolate the tuning change; the native tests establish integration behavior, rather than statistical superiority across weather.

The [feature branch’s paired mission-development parameter files](https://github.com/DavidIngraham/ardupilot/commit/5f483ade60) now select TECS_VERT_ACC = 3.5. This changes development tuning, not ArduPilot's generic parameter default. The new low-voltage and softer-roll results are local linear checks; the fresh native runs here use the nominal model at 22.2 V.

## Seeing why the damping path matters

These diagnostic videos retain the earlier climb-feedback setting to isolate the damper configurations. They explain the architecture; they are not recordings of the doubled-PI candidate.

<video controls muted loop playsinline preload="metadata" poster="assets/viewer/pitch-sign/pitch-sign-carriage.jpg" style="width:100%">
  <source src="assets/viewer/pitch-sign/pitch-sign-carriage.mp4" type="video/mp4">
</video>

*Identical small pitch-rate disturbances: damper off, fast original sign, reversed sign, and two-stage filtering. The camera preserves carriage translation and rotation. Standalone truth-sensed simulation.*

<video controls muted loop playsinline preload="metadata" poster="assets/viewer/altitude-comparison/altitude-comparison-smooth-camera.jpg" style="width:100%">
  <source src="assets/viewer/altitude-comparison/altitude-comparison-smooth-camera.mp4" type="video/mp4">
</video>

*A 100 → 105 m altitude command separates the fast-sign problem from slower instability. Off and two-stage-filtered cases settle; simply reversing the fast damper does not. These are diagnostic alternatives, not flight recordings.*

## The controller flying the aircraft

The calm, gust and crosswind clips below show native AUTO with the same two-stage damper and the preceding climb-feedback gains. They retain the CAD payload, articulated suspension, rotating capstans and propeller, throttle history, brake pull, wind indicator, ground track and altitude side profile. The numerical comparisons above document the subsequent PI refinement.

**Calm air**

<video muted loop playsinline controls preload="metadata" width="1280" height="852" poster="assets/viewer/auto-calm-profile-plain.jpg" aria-label="Calm-air native AUTO mission with ground track, altitude side profile, throttle history and brake pull">
  <source src="assets/viewer/auto-calm-profile-plain.mp4" type="video/mp4">
  <source src="assets/viewer/auto-calm-profile-plain.webm" type="video/webm">
  Your browser does not support inline video.
</video>

**Moderate synthetic gusts**

<video muted loop playsinline controls preload="metadata" width="1280" height="852" poster="assets/viewer/auto-gust-profile-plain.jpg" aria-label="Gusty native AUTO mission with ground track, altitude side profile, throttle history and brake pull">
  <source src="assets/viewer/auto-gust-profile-plain.mp4" type="video/mp4">
  <source src="assets/viewer/auto-gust-profile-plain.webm" type="video/webm">
  Your browser does not support inline video.
</video>

**Steady 2 m/s eastward wind**

<video muted loop playsinline controls preload="metadata" width="1280" height="852" poster="assets/viewer/auto-crosswind-profile-plain.jpg" aria-label="Native AUTO mission in steady 2 m/s eastward wind with ground track, altitude side profile, throttle history and brake pull">
  <source src="assets/viewer/auto-crosswind-profile-plain.mp4" type="video/mp4">
  <source src="assets/viewer/auto-crosswind-profile-plain.webm" type="video/webm">
  Your browser does not support inline video.
</video>



## Scope and next steps

This is an up-and-away simulator controller, evaluated on a model informed by the flights. Original flight-tested settings remain distinct from new SITL settings. Launch, canopy collapse, landing flare and flight validation are outside this study. Saturation, estimator delay and model error remain reasons to check nonlinear and native behavior after linear design.

A relative-motion observer remains a possible extension. The present result uses the existing payload gyro and navigation estimates. Next comes aircraft validation and, separately, testing the lateral 1 Hz candidate alongside this longitudinal tuning.

[Data and methods](data-and-methods.md#full-loop-longitudinal-design) records reproduction commands, numerical results, parameter provenance and the archived experimental sequence. Raw trajectories and flight logs remain in Mission Planner.
