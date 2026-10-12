# Throttle, Pitch, and the Controller That Pushed the Wrong Way

*Micro-AGU, chapter 4 of 4 · [Start with the flight story](flight-testing.md) · [Design](micro-agu-design.md) · [Steering](paraglider.md) · [Throttle and pitch](longitudinal-observer.md) · [Data and methods](data-and-methods.md)*

ArduPlane already had a controller for managing altitude and airspeed: TECS, the Total Energy Control System. I wanted to keep its connection to the navigation and flight-mode machinery, but change how it controlled the aircraft. A parafoil does not have an elevator, and the suspended payload's pitch is not something I can command like an airplane's attitude.

My first adaptation used throttle to control climb and descent while letting the canopy fly near its trimmed airspeed. I also borrowed a pitch-rate damper from the ACRA paramotor paper to suppress pitching during altitude changes. The altitude controller got me to autonomous missions; the damper exposed a mistake in how I pictured the aircraft's response to thrust. The rest of this story follows that separation—from the original TECS changes, through flight measurements, to the frequency-shaped controller now running in simulation.

## What TECS normally controls

[TECS](https://ardupilot.org/plane/docs/tecs-total-energy-control-system-for-speed-height-tuning-guide.html) coordinates throttle and pitch demands to manage height and airspeed. The useful starting point is the aircraft's specific energy: potential energy per unit mass is $gh$, and kinetic energy per unit mass is $V^2/2$.

$$
E_T = gh + rac{V^2}{2}.
$$

Throttle controls the rate at which energy is added to the aircraft. Pitch helps determine how that energy is divided between speed and height. Climbing by pitching up alone can spend airspeed; adding power allows a sustained climb without that continuing loss of speed. TECS coordinates those demands, and the airplane's pitch controller uses the elevator to follow the requested attitude.

That second actuator was the mismatch for my aircraft. Symmetric brake pull was not a reliable substitute for elevator-based pitch control. Using it continuously that way would compromise efficiency and wing stability. I wanted to reserve symmetric braking primarily for a landing flare, which I still intend to add. Landing was outside the scope of the initial project phases.

## Adapting TECS to throttle-only altitude control

In my [original paraglider TECS implementation](https://github.com/DavidIngraham/ardupilot/commit/8ed5b0689e31aa9a27fa2cf78057dce15f9b0d16), I replaced the kinetic-energy and energy-balance control with a vertical-speed controller. Pitch demand stayed at trim. Approximately constant airspeed was the operating assumption for this first version, not a claim that brakes, turns or gusts could never change it.

I retained TECS's altitude and climb-rate estimates, throttle limits and connection to the flight modes. The control path became:

1. Shape the requested altitude into a climb/sink-limited trajectory.
2. Convert altitude error into a vertical-speed demand, adding the trajectory's own rate of change.
3. Estimate the required throttle from trim and the configured climb/sink performance.
4. Correct vertical-speed error with proportional and integral feedback.
5. Add a separate pitch-rate damping correction.

Let $h_c$ be the shaped altitude demand, $h$ measured altitude, and $v_z$ measured upward velocity. Before the climb/sink limits, the outer loop requests

$$
v_{z,c} = dot h_c + rac{h_c-h}{T_h}.
$$

The first term anticipates a moving altitude target; the second closes the remaining height error over the height-demand time constant $T_h$. With $e_v=v_{z,c}-v_z$, the inner control law can be summarized as

$$
u_T = u_{mathrm{FF}}(v_{z,c})
      + K_P e_v
      + K_I int e_v,dt
      - K_q F_q(s),q_{mathrm{payload}}.
$$

Here $u_T$ is throttle fraction, $u_{mathrm{FF}}$ is the climb/descent feedforward map, and $F_q$ filters the payload gyro's pitch rate. This equation shows the signal paths; the implementation also applies throttle limits, slew limiting to the proportional-plus-feedforward path, integrator bounds and a bounded damper correction.

The feedforward map was an important part of the design. I did not want the integrator to discover the throttle required for every sustained climb. Trim throttle supplied the level-flight baseline, while the configured climb and sink rates set the slopes toward the throttle limits. The flight measurements below let me calibrate that relationship.

The pitch-rate path had a different job: suppress oscillation while preserving a responsive altitude change. The ACRA paper describes stabilizing pitch during altitude control and reports reduced altitude oscillations without degrading transient response. That was the behavior I wanted. It was also where the difference between a rigid aircraft model and my suspended payload became important.

## The damper that could make things worse

I had added a pitch-rate damper to throttle. My initial intuition was that more throttle would pitch the model up, so adding throttle during a nose-down rotation should oppose that motion.

That idea came from Umenberger and Göktogan’s [ACRA 2012 paramotor paper](https://www.araa.asn.au/acra/acra2012/papers/pap151.pdf). Figure 6 feeds pitch rate back into throttle, and Figures 8–9 show a simulated nose-up throttle-step response and improved damping. But §2.1 treats canopy and fuselage as one rigid body, while §2.2 holds their relative pitch fixed. That removes the independent payload-pitch mode that matters here.

The distinction is in the model and the response being controlled. Their §5 pitch transfer function was fitted to their six-DOF simulation; the paper’s flight-data identification concerns lateral dynamics. I did not find evidence establishing that a physically locked suspension made that damper sign valid on their real aircraft. The feedback makes sense for their modeled nose-up response; importing that sign into my payload-gyro loop was the mistake.

The throttle damper used:

```cpp
throttle_correction = -pitch_damping_gain * filtered_payload_pitch_rate;
```

With positive pitch rate defined as nose-up, a nose-down rotation produces a positive throttle correction. That only gives the intended damping if the relevant throttle-to-pitch response has the sign I expected.

The articulated model showed why that assumption could fail. The thrust line is below the suspension point, but above the payload CG. Forward thrust therefore produces a nose-down moment about the payload CG. The suspension point moves with the system; treating it as a fixed pivot leaves out an important part of the dynamics.

![Free-body diagram of the payload and canopy, showing thrust above the payload CG and the reinforcing feedback sequence](assets/flight-testing/pitch-damper-fbd-pusher.png)

*The pusher thrust acts above the payload CG, creating a nose-down moment. The canopy and payload react through the suspension. Schematic, not to scale.*

<video controls muted loop playsinline preload="metadata" poster="assets/viewer/pitch-fbd/pitch-fbd.jpg" style="width:100%;height:auto"><source src="assets/viewer/pitch-fbd/pitch-fbd.mp4" type="video/mp4"></video>

*Left: my original whole-aircraft picture, with relative pitch locked and thrust below an assumed combined CG. Right: the payload can pitch independently; thrust acts above its CG, and its initial response is nose-down while the upper attachment moves forward. The side view uses the carriage CAD with schematic suspension and canopy. Geometry, angles and timing illustrate the mechanism rather than reproducing a simulation trace. The arrows isolate the incremental thrust moment; suspension reactions and aerodynamic forces also enter the full dynamics. The locked connection illustrates my assumption, not the ACRA aircraft’s construction.*

The later analysis explained the reinforcing loop:

**Payload pitches down → controller adds throttle → payload pitches down harder.**

I did not work this out at the field. Fortunately, I decided to disable the damper while testing, and the aircraft immediately became quieter. The logs and simulation later explained why: I had designed the feedback around the wrong initial pitch response. A throttle increase can rotate the payload nose-down even while the aircraft’s longer-term response is to climb. The moving suspension and the canopy’s aerodynamic forces determine how that motion develops.

The flight data contains a particularly useful comparison. In CRUISE, I had already set the throttle P and I gains to zero. At 655.79 seconds after boot, I set the pitch damper to zero too. In the tightly bounded windows below, that was the only control setting changed.

![Pitch rate and throttle immediately before and after the pitch damper was disabled](assets/flight-testing/damper-off.png)

| February 15 comparison | Boot-time window | Payload pitch-rate RMS |
|---|---:|---:|
| Damper gain 0.10; throttle P = I = 0 | 635–654 s | 76.4 degrees/s |
| Damper gain 0; throttle P = I = 0 | 659–681 s | 22.7 degrees/s |

The fast oscillation reduced sharply. Later in the same flight, reintroducing the damper at 0.05 coincided with a stronger component around 1.5 Hz; reducing it to 0.02 brought the rate RMS back down. Those observations support the self-excitation concern.

The logs gave me two tasks: understand that coupled motion, and establish a sound throttle baseline before asking feedback to improve it.

## Measuring what throttle could do

I used live telemetry and later Hood River log analysis to choose climb and sink settings. At the beginning of Trout Lake, I repeated the throttle tests with the heavier configuration and used level-flight testing to settle on 43% trim throttle.

![Throttle and climb measurements from Hood River and early Trout Lake](assets/flight-testing/throttle-climb-fit.png)

*Local fits to steady 10-second MANUAL/FBWA windows put level throttle near 35.5% at Hood River and 42.7% at Trout Lake. The Hood River result includes the brake trim and false power limiting present that day.*

| Setting | Sustained Hood River flight | Trout Lake start | Trout Lake final |
|---|---:|---:|---:|
| Maximum throttle | 40% | 40% | 60% |
| Trim throttle | 30% | 30% | 43% |
| Climb limit | 2 m/s | 1.8 m/s | 1.8 m/s |
| Maximum sink | 2 m/s | 3 m/s | 3 m/s |

Early at Trout Lake I raised maximum throttle to 65% and trim to 50%, then brought them back to 60% and 43%. The climb and sink limits were already set before takeoff. I derived those limits from Hood River logs; the local steady-response fits above reconstruct the trim relationship, rather than those original limit-selection intervals.

In the paraglider TECS implementation, trim is the zero-climb baseline. Requested climb or descent interpolates throttle toward its upper or lower bound:

```text
Climbing:   throttle_ff = trim + (climb_demand / climb_limit) × (max − trim)
Descending: throttle_ff = trim + (climb_demand / sink_limit) × (trim − min)
```

The limits therefore set feed-forward slopes as well as bounding the requested vertical speed. P and I correct the remaining climb-rate error. That baseline tuning was separate from the pitch damper, which responded to angular motion.

## Returning to native mission control

The simulator eventually grew into a 9-DOF model with separate canopy and payload motion, representing the 1.758 kg Trout Lake configuration. Early experiments with direct access to joint state showed that relative-motion feedback could help, but estimating that state on the real aircraft introduced another problem. I kept the [joint-controller and observer experiments](data-and-methods.md#longitudinal-joint-control-and-observer-research) as a longer-term path and returned to the signals and control loops already available in ArduPilot.

Working with Codex, I bounded this study to two controller revisions with the model coefficients held fixed. Each candidate flew an airborne sequence of climb, altitude capture, descent, and sustained turns. We then repeated the selected settings with a softer roll model and lower voltage, and ran the existing full AUTO test. We kept useful tradeoffs instead of requiring every metric to improve.

The first surprise was lateral: the brakes were exciting payload motion. Reducing heading-rate feedback made straight flight much quieter; correcting excessive steering feedforward then made sustained turns predictable. The [lateral chapter](paraglider.md#tuning-the-dedicated-loop-with-separate-canopy-and-payload-motion) shows those changes and the evolving control loops. A pitch-rate signal alone could not tell me where the motion originated.

The later [linear lateral analysis](paraglider.md#what-the-linear-analysis-tells-me) put that coupling into frequency-domain terms. The 9-DOF plant contains mixed pitch, yaw and translational modes, and the selected steering feedback leaves a lightly damped closed-loop pair near 2.54 Hz. Lowering the lateral measurement filter to 1 Hz, or adding a broad notch, improved modeled stability margins without changing throttle control. The 1 Hz candidate subsequently passed six matched native AUTO trials in calm air, gusts and steady crosswind, reducing rapid brake activity with mixed gust-rate tracking results. The historical native longitudinal and AUTO results below still use the 4 Hz lateral filter. This reinforces the sequence: quiet the steering-driven motion before asking a throttle damper to suppress it.

### Match throttle feedforward to the simulated aircraft

Model trim calculations required 44.6% throttle for level flight and 59.9% for a 1 m/s climb at 22.2 V. With a 60% throttle ceiling, I selected 45% cruise throttle and a 1 m/s climb calibration. Holding the brakes fixed isolated the vertical-feedforward benefit: climb height RMS error dropped from about 0.73 to 0.08 m.

The descent calibration became 2.5 m/s to fit the local descending-throttle slope. These settings calibrate feedforward to this simulator; they do not replace my flight-derived climb/sink estimates or establish a new full-glide sink limit.

![Matched native controller responses before and after the two revisions](../research/flight-log-analysis/figures/turn-model-spike/longitudinal-design/final-comparison.png)

*The same simulated aircraft, before and after controller changes. Across the matched climb phase, height RMS error improved from 0.92 to 0.14 m. The lateral changes remove much of the motion that otherwise feeds into the longitudinal problem.*

### Smooth the altitude-capture kick

A sharp pitch transient remained when the climb command returned to neutral. Native FBWB captures current altitude at that point. The resulting demand change produced a brief derivative spike, which went into throttle feedforward.

I added a first-order smoother to that derivative:

```text
filtered_rate += dt / (dt + time_constant) × (raw_rate − filtered_rate)
```

The selected time constant is 0.5 seconds. Height feedback and trajectory slew limits stay unchanged. `TECS_PG_HR_TC` defaults to zero, preserving the previous behavior unless explicitly enabled.

![Altitude capture with and without derivative-feedforward smoothing](../research/flight-log-analysis/figures/turn-model-spike/longitudinal-design/capture-smoothing.png)

*Only the smoothing setting changes in this comparison. Peak pitch rate during climb capture falls from 64.1 to 14.7 degrees per second—a 77% reduction.*

Climb height RMS error increases from about 0.10 to 0.14 m, and capture error from 0.06 to 0.08 m. I would take that small tracking penalty for a much gentler capture. The scoring reference remains the underlying height trajectory; filtering the feedforward does not silently smooth away the measured error.

### Keep the existing voltage compensation connected

The same gains remained well behaved with a softer roll model. The first low-voltage test exposed a setup mistake: ArduPlane already had voltage compensation, but the simulation disabled the battery monitor, left compensation off, and did not send the motor model's voltage to the flight controller. Our initial standalone analysis omitted that output scaling too. We corrected the setup and reran both analyses.

With the existing compensation enabled, reducing supply voltage from 22.2 to 20.4 V now increases the throttle command automatically. We kept 22.2 V as the reference because that is where we calibrated these simulator throttle settings; it is not the full-charge voltage of a 6S pack. In matched native runs at 20.4 V, climb height RMS error fell from **0.486 to 0.250 m**, and level-phase error from **0.633 to 0.016 m**. At 22.2 V, compensation on/off gave essentially the same result.

![Native voltage-compensation comparison, showing altitude error, payload pitch rate, TECS demand and final motor command](../research/flight-log-analysis/figures/turn-model-spike/voltage-compensation/voltage-response.png)

There is a tradeoff: climb-capture height RMS error increased from **0.096 to 0.169 m**. Native compensation also raises the maximum throttle returned to TECS, changing its climb feedforward slope before the final output scaling. The corrected linear and nonlinear analysis includes that interaction. This fixes the missing battery path and improves low-voltage tracking; it does not eliminate every capture transient or justify enabling the pitch damper.

Both voltage settings passed the full AUTO regression with the original checks unchanged. Maximum waypoint altitude error was 1.67/1.68 m at 22.2/20.4 V, while corner overshoot was 0.95/2.89 m. The lower-voltage case still turns wider at the worst corner, despite its steady loiter motion.

At this stage I left the pitch damper off. Calibrated feedforward, quieter steering and smoother altitude capture produced a useful calm-air baseline, and that combination passed the existing full AUTO mission. Small reversed-sign damper candidates did not improve settled motion enough to keep.

To understand what the damper should add to that baseline, I separated two questions: what does it do to a brief disturbance, and what does it do when motion continues? The following matched comparisons make the distinction visible.

<a id="watching-the-sign-problem-in-the-current-model"></a>

## Why reversing the sign was not enough

This comparison uses the current 9-DOF plant, Trout Lake mass (1.758 kg), 22.2 V and the same asymmetric brake trim. At two seconds, each run receives the same +5°/s payload pitch-rate disturbance. The base throttle stays at its level-flight trim; only the pitch-feedback correction changes. Holding the brakes fixed removes steering excitation from this experiment.

<video controls muted loop playsinline preload="metadata" poster="assets/viewer/pitch-sign/pitch-sign-carriage.jpg" style="width:100%">
  <source src="assets/viewer/pitch-sign/pitch-sign-carriage.mp4" type="video/mp4">
</video>

*Matched standalone simulation, with truth-rate feedback rather than native AUTO. The SolidWorks carriage is shown from a fixed side-oblique angle, with the propeller animated from simulated RPM. The camera follows the nominal straight-flight path rather than the actual payload, preserving both translation and rotation against a 10 cm grid. An orange marker and short trail track the upper suspension attachment. The first 5.5 seconds play at real speed, followed by a quarter-speed replay of the oscillation onset. Angles and displacements are unamplified; the plots share scales.*

With gain 0.10 and a single 10 Hz filter, the original minus-sign feedback turns the small disturbance into a sustained, throttle-limited oscillation. Reversing that sign keeps this fast motion small. Turning the damper off also lets the disturbance decay. The fourth panel previews the solution developed below: it retains the minus sign but applies two 1.5 Hz filter stages, and this disturbance decays too. The plant therefore reproduces the sign-sensitive excitation, while also showing why the feedback's frequency response matters alongside its sign.

The large oscillation is a diagnostic result, not a prediction of the exact Hood River amplitude. This isolates the pitch-feedback path; the native mission and gust tests below establish how the selected filtering behaves with the rest of the controller running. The [generation script](../tools/pitch_sign_video.py), [CAD comparison renderer](../viewer/src/pitch-comparison.ts) and [configuration and results](assets/viewer/pitch-sign/pitch-sign.json) record the experiment, with raw trajectories retained in Mission Planner.

### Commanding a climb with the four damper configurations

The small-disturbance comparison leaves a practical question: what happens when the controller deliberately asks the aircraft to climb? This experiment commands **100 → 105 m at five seconds**, with the same height loop and lateral controller in every run. There is no injected pitch kick. Each nonzero pitch damper is enabled with the altitude command, after the same initial settling period. The height loop converts altitude error to a limited climb-rate demand and uses the same 0.5-second feedforward smoothing; throttle is capped at 60%.

<video controls muted loop playsinline preload="metadata" poster="assets/viewer/altitude-comparison/altitude-comparison-smooth-camera.jpg" style="width:100%">
  <source src="assets/viewer/altitude-comparison/altitude-comparison-smooth-camera.mp4" type="video/mp4">
</video>

*Current 9-DOF plant, actual SolidWorks carriage and schematic canopy. Orange is payload pitch; green is canopy pitch. The angle indicator compares both attitudes against the horizon, not against the airflow. Altitude, pitch and throttle plots use common scales. The camera follows smoothed translation to keep the whole glider visible throughout the climb; the altitude trace shows its vertical progress. Playback is real time.*

This longer maneuver separates the outcomes more clearly than the short pitch kick. The original fast-filtered minus sign excites rapid motion and repeatedly reaches the throttle ceiling. Reversing the sign initially looks quieter, but subsequently develops a slower, large oscillation and loses much of the altitude it gained. Damper-off and the current two-stage filter both complete the climb and settle near the target.

| Configuration | Altitude at 50 s | Payload pitch-rate RMS, 40–50 s |
|---|---:|---:|
| Damper off | 104.98 m | 0.008°/s |
| Original sign, 10 Hz filter | 103.12 m | 136.0°/s |
| Reversed sign, 10 Hz filter | 101.84 m | 73.5°/s |
| Current sign, two 1.5 Hz stages | 104.98 m | 0.008°/s |

The reversed-sign case reaches 104.88 m before losing height. That is why suppressing the fast payload mode alone is not enough: the same feedback also acts on slower coupled motion. In this calm maneuver the current filter and damper-off cases have essentially the same settled altitude performance; the gust comparisons below establish the additional reason to retain the filtered damper. Large unstable excursions here illustrate the failure mechanism rather than predict precise flight amplitudes.

This is a **standalone, truth-sensed controller diagnostic**, using the height-loop algebra and the current plant, rather than a new native SITL regression. The [experiment script](../tools/altitude_comparison.py), [animation renderer](../viewer/src/altitude-comparison.ts) and [configuration and results](assets/viewer/altitude-comparison/altitude-comparison.json) preserve the setup. Raw trajectories remain in Mission Planner under `turn-model-spike/altitude-comparison`.

## What the gust video exposed

The calm climb explained why I could leave the damper off, but the [articulated AUTO video](paraglider.md#the-controller-flies-the-mission) exposed what that choice was missing: the aircraft keeps pitching in the synthetic gusts. The controller holds average height reasonably well, but the motion is not well suppressed.

![Calm and gusty AUTO loiter entry: height error, climb, payload and canopy pitch, throttle and vertical gust](assets/viewer/auto-longitudinal-gusts.png)

*Two independent 55-second loiter-entry excerpts with the same controller, aligned by approach to mission item 3. Solid pitch lines are payload attitude; dashed lines are canopy attitude. These are simulated truth measurements, not flight data. The calm and gusty trajectories differ, so this is a descriptive comparison rather than an isolated controller ablation.*

| Quantity in the excerpt | Calm | Synthetic gusts |
|---|---:|---:|
| Height error RMS | 0.15 m | 0.52 m |
| Climb-rate RMS | 0.08 m/s | 0.70 m/s |
| Payload pitch standard deviation | 1.24° | 9.69° |
| Throttle range | 44.4–46.1% | 41.8–49.3% |

In gusts, payload pitch ranges from −11.7° to +26.3° and climb rate from −1.41 to +1.34 m/s. The dominant pitch/climb response is near 0.36 Hz, or one cycle every 2.75 seconds. Height error is much smaller, −0.81 to +1.49 m: an oscillating vertical velocity integrates into a comparatively modest altitude excursion. Both bodies pitch substantially; the visible movement is not solely rotation at their joint.

The gust generator includes a 0.34 Hz component, close to the modeled slow pitch/forward-speed mode. It continues supplying energy throughout this clip. The response is consistent with excitation near that mode, but this comparison does not establish whether throttle feedback amplifies it or merely responds to it. A passing AUTO mission is therefore evidence of route completion, not evidence of satisfactory longitudinal damping.

I next replayed the same gust history from the same initial state with normal throttle control, fixed trim throttle, and the near-mode gust component removed. The [original comparison script](../viewer/tools/analyze_auto_gusts.py) and [summary metrics](assets/viewer/auto-longitudinal-gusts.json) preserve the video diagnosis; the following experiments test the remedy.


## Shaping the damper around the gust response

Holding throttle fixed still produced **7.82° pitch standard deviation**, compared with **9.45°** with the original height controller. Most of the motion was the airframe responding to the gusts, with some amplification from the control loop. Removing the 0.34 Hz gust component reduced pitch variation to **4.16°**. That also reduced total gust energy, so it is evidence about the excitation mechanism rather than an equal-energy comparison.

A small pitch-rate feedback term helped when its frequency response was shaped around the slow mode. The first candidate used gain 0.1 and one 0.5 Hz low-pass stage. It improved the nonlinear response and passed a complete gusty AUTO mission, but a wider linear check exposed a roughly 2.4 Hz coupled mode becoming unstable in the softer-roll model at stronger lateral airspeed scaling. A second filter stage gave us another way to shape both phase and attenuation.

The selected configuration uses two cascaded **1.5 Hz** first-order stages and a pitch-rate gain of **0.1**:

$$
\Delta u_T(s)=-0.1\left(\frac{2\pi(1.5)}{s+2\pi(1.5)}\right)^2q_{\mathrm{payload}}(s).
$$

Here $q$ is body pitch rate in rad/s and $u_T$ is throttle fraction. Each stage has a 1.5 Hz cutoff; the combined continuous-time filter reaches −3 dB at about 0.97 Hz. Native code applies the discrete first-order filters at the measured update interval, limits the correction to ±0.25, and retains the final throttle limits. Height feedforward, height feedback, integration, voltage compensation and lateral gains are unchanged. Washout is off.

![Filter magnitude and phase, with movement of the slow pitch/forward-speed poles](../research/flight-log-analysis/figures/turn-model-spike/gust-control/filter-and-poles.png)

At nominal level trim, the slow poles move from **−0.248 ± j2.254** to **−0.658 ± j2.186 s⁻¹**. Their damping ratio rises from **0.109 to 0.288**. The selected setting remains locally stable in seven saved plant cases—including climb, descent, lower voltage and softer roll—at lateral airspeed scaling 0.9, 1.15 and 1.4. These are local model checks; they do not include every estimator delay or establish flight robustness.

This does not reverse the conclusion from the original flight damper. The feedback path now has a different frequency response. A sign and a gain alone cannot describe how the throttle loop acts on both the slow motion and the faster canopy–payload modes.

![Matched nonlinear gust histories with the original and selected controllers](../research/flight-log-analysis/figures/turn-model-spike/gust-control/two-pole-comparison.png)

In the matched nonlinear screen, pitch standard deviation fell from **9.45° to 6.17°**, climb-rate RMS from **0.71 to 0.46 m/s**, and height RMS error from **0.48 to 0.40 m**. Pitch-rate RMS also fell, from **21.57 to 18.03°/s**. The cost was more throttle activity: its standard deviation rose from **1.65 to 2.65 percentage points**, with no saturation. The gusts stop at 80 seconds in the plot; the filtered controller also damps the remaining motion more quickly.

A separate gust realization with 50% higher component amplitudes retained the improvement: pitch variation fell from **9.30° to 6.84°** and climb-rate RMS from **0.74 to 0.54 m/s**. Raising the damper gain to 0.15 or 0.2 with the earlier 0.75 Hz stages increased pitch-rate motion and throttle effort, so I kept the smaller gain and improved the filter shape instead.

### Back in the native AUTO mission

The two-stage controller passed the full gusty AUTO mission with the original checks unchanged. That includes altitude changes, both two-turn loiters, corner checks, home loiter and controller handover. The native BIN confirms gain 0.1, both 1.5 Hz stages and washout disabled; the model backend recorded no errors or clipped input packets.

![Native AUTO loiter entry before and after frequency-shaped pitch damping](../research/flight-log-analysis/figures/turn-model-spike/gust-control/native-comparison.png)

*The same route, model and gust generator, with excerpts aligned independently at the first loiter approach. The route timing changes, so the two excerpts sample different gust phases. The matched screen above isolates the controller change; this comparison checks its native implementation.*

The improvement persists beyond that excerpt. For each loiter I excluded the first 20 seconds after coming within 60 m of its center, then measured the remaining loiter:

| Quantity | CW: before → after | CCW: before → after |
|---|---:|---:|
| Payload pitch standard deviation | 9.90° → 6.62° | 11.13° → 6.59° |
| Pitch-rate RMS | 21.95 → 19.02°/s | 25.95 → 18.53°/s |
| Climb-rate RMS | 0.70 → 0.42 m/s | 0.78 → 0.43 m/s |
| Height error RMS | 0.50 → 0.41 m | 0.52 → 0.43 m |
| Throttle standard deviation | 1.69 → 2.90 percentage points | 1.80 → 2.81 percentage points |

Across the full gusty mission, maximum waypoint height error fell from **2.66 to 2.26 m**, and maximum corner overshoot from **3.50 to 1.39 m**. Those navigation improvements are observations from these runs, not a guarantee for every wind realization. The central result is that both turn directions show materially less longitudinal motion, with additional throttle effort.

The calm AUTO regression also passed. Settled pitch standard deviation fell from **0.21° to 0.10°** in the clockwise loiter and **0.33° to 0.07°** in the counterclockwise loiter. Height RMS error changed from **0.055 to 0.064 m** and **0.098 to 0.080 m**, respectively. Maximum waypoint altitude error changed slightly, **1.67 to 1.71 m**, while corner overshoot improved from **0.65 to 0.36 m**. The new controller therefore retains the calm mission behavior while damping the gust-driven motion.

The feature branch now includes the optional `TECS_PG_PR_FILT2` stage, defaulting to bypass, and the paired mission-development parameter files select the tested 0.1 gain and two 1.5 Hz stages. These are SITL development settings; appreciable forced motion remains in gusts, and the new tuning has not been flown. The low-voltage and softer-roll checks here are linear sensitivity tests, not additional native AUTO runs.

The [matched-screen script](../tools/gust_control_study.py), [linear check](../tools/gust_linear_check.py), [native mission runner](../tools/run_gust_native.sh), [mission summarizer](../tools/summarize_gust_mission.py), [comparison plotter](../tools/plot_gust_control.py) and [filter/pole plotter](../tools/plot_gust_filter.py) preserve the experiment. Raw state histories, BIN logs and the working HTML research log remain in Mission Planner under `turn-model-spike/gust-control`.

The implementation and tested mission settings are in [ArduPilot commit 2588ecc44a](https://github.com/DavidIngraham/ardupilot/commit/2588ecc44a) on the existing controller-development branch.

## Where that leaves the controller

The lesson was broader than reversing a sign. The ACRA model gave me a useful starting idea, but my payload gyro sees motion that its rigid-body model excludes. The flight logs exposed that difference. Reproducing it in simulation showed why a fast damper could excite the payload, while the climb comparison showed why simply reversing the sign could excite slower motion instead.

The current design combines calibrated throttle feedforward, smoother altitude capture, existing voltage compensation and a modest pitch-rate correction with two low-pass stages. It improves gust response in native SITL without sacrificing the calm mission behavior. Flight validation is the next step; a relative-motion observer remains a separate development path.

The [calm, gusty and crosswind AUTO videos](paraglider.md#the-controller-flies-the-mission) show the complete aircraft and control responses. The [methods appendix](data-and-methods.md#longitudinal-joint-control-and-observer-research) keeps the earlier joint-control experiments, observer equations and detailed calibration record together.
