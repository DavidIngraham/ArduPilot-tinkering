# Steering a Parafoil with an Airplane Autopilot

*Micro-AGU, chapter 3 of 4 · [Start with the flight story](flight-testing.md) · [Design](micro-agu-design.md) · [Steering](paraglider.md) · [Throttle and pitch](longitudinal-observer.md) · [Data and methods](data-and-methods.md)*

I initially thought I would need to design a yaw-rate controller for the parafoil. Differential braking makes it turn, so controlling the rate of that turn seemed more natural than asking an airplane roll controller to do the job. I wanted to keep ArduPlane's navigation and replace the part that translated its demands into brake movement.

As I worked through my notes, I figured out that I could get much of the same behavior by changing the gains in the controller that was already there. The trick was to turn off the inner roll-rate feedback and use its feed-forward path as an angle gain. With bank angle standing in for turn rate, that gave me a practical route to the first flights without writing the new controller immediately.

The flights got me to working autonomous missions. Later, a model with separate canopy and payload motion exposed how steering corrections could excite the suspended payload, and gave me a way to tune turn tracking and damping separately. Thinking through the flight behavior afterward and testing the loops in simulation brought me back to the original idea: a dedicated turn-rate controller would make the response easier to tune and the achievable turns easier to express. The [flight-test post](flight-testing.md) covers the aircraft tests; this page follows that progression in the lateral controller.

## Getting the first controller by changing the gains

I started by breaking ArduPlane's roll controller into its individual paths. It normally converts bank-angle error into a requested roll rate, then uses rate feedback and feed-forward to drive the ailerons. I crossed out the rate P, I, and D paths and followed what was left. The feed-forward path reduced to something much simpler: essentially a proportional gain on bank-angle error.

![Original lateral-control analysis comparing ArduPlane, the first-flight configuration, and the simplified angle controller](assets/micro-agu/lateral-control-notes.png)

*January 30 control-law notes: keep the navigation and angle-error calculation, then use rate feed-forward to drive the brakes.*

![Original nested bank-angle and roll-rate loops](assets/control-loops/original-roll.png)

*The starting architecture: bank-angle error generates a roll-rate target; rate feedback and feedforward drive the actuators. This diagram omits implementation details to show the two loops.*

A conventional airplane roll controller has two nested loops. Bank-angle error creates a requested roll rate, then a rate controller drives the ailerons. For my parafoil, the output instead goes through the brake mixer. Differential braking produces a turn and the associated bank, so I wanted a simple angular correction rather than an inner loop tuned around aileron-driven roll dynamics.

Let φ_cmd be commanded bank, φ be measured bank, τ be `RLL2SRV_TCONST`, and K_FF be `RLL_RATE_FF`. Ignoring the target filter and limits for the moment, ArduPlane's outer loop computes:

```text
e_φ   = φ_cmd − φ
p_cmd = e_φ / τ
```

The rate feed-forward term is proportional to that requested rate. With rate P, I, D, and derivative feed-forward set to zero, it is the only active rate-controller contribution:

```text
u = K_FF p_cmd
  = (K_FF / τ) (φ_cmd − φ)
  = K_φ e_φ

K_φ = K_FF / τ
```

**The rate feed-forward gain becomes a proportional bank-angle gain.** It is feed-forward with respect to the inner rate loop, but the complete loop still feeds back measured bank angle. There is no integration hidden in the cancellation: the requested rate is just angle error multiplied by 1/τ. Measured roll rate no longer contributes when its feedback gains are zero.

![Flight-tested angle-control workaround using rate feedforward](assets/control-loops/flight-angle-workaround.png)

*The flight configuration removes the measured-roll-rate inner loop. Rate feedforward acts on bank-angle error through the outer angle gain. Trout Lake adds derivative feedforward to this same path.*

### Including ArduPilot's speed scaling

The implementation scales the PID inputs and rescales feed-forward on the way out. Let S be the supplied speed scaler, E be the true/equivalent airspeed ratio (`EAS2TAS`), and F be the feed-forward multiplier (`ff_scale`, normally 1). With angles expressed in degrees:

```text
PID target = radians(p_cmd) S²
PID FF     = K_FF radians(p_cmd) S²

u_FF = degrees(F × PID FF / (S E))
     = F K_FF (S / E) p_cmd
     = [F K_FF S / (E τ)] (φ_cmd − φ)

Effective angle gain: K_φ = F K_FF S / (E τ)
```

The radians/degrees conversions cancel, as does one factor of S. The nominal speed scaler is reference speed divided by estimated airspeed; the actual supplied scaler includes ArduPlane's bounds and fallback behavior. At fixed scaling, feed-forward is still simply an angle gain. The final controller output is converted to centidegrees, limited to ±4500, and passed to the mixer—these are controller units, not measured degrees of brake travel.

The Hood River log records the configuration that implements this idea:

| Parameter | Logged value | Role |
|---|---:|---|
| `RLL2SRV_TCONST` | 1.0 s | Converts bank error to rate demand |
| `RLL_RATE_FF` | 0.345 | Supplies the effective angle gain |
| `RLL_RATE_P`, `RLL_RATE_I`, `RLL_RATE_D` | 0 | Removes inner rate-error feedback |
| `RLL_RATE_D_FF` | 0 | No derivative feed-forward in this flight |
| `RLL2SRV_RMAX` | 0 | Disables the requested-rate limit |
| `RLL_RATE_FLTT` | 3 Hz | Filters the rate target before feed-forward |

For example, with S = E = F = 1, a 10° bank error produces a 10°/s rate request and a feed-forward output of 3.45 controller degrees, or 345 centidegrees. Changing FF changes the angular correction directly; halving τ doubles it.

The 3 Hz target filter means the dynamic implementation is a filtered angle controller. At constant speed scaling, with H_T(s) representing that filter:

```text
u_FF(s) = K_φ H_T(s) [φ_cmd(s) − φ(s)]
```

### Where damping fits

I also worked through how I could add damping using the derivative feed-forward path. If derivative feed-forward is enabled, it differentiates the requested rate—which already contains bank-angle error. At fixed scaling, its contribution reduces to:

```text
u_DFF = [F K_DFF S / (E τ)] d(φ_cmd − φ)/dt
```

For a steady bank command this becomes a negative bank-rate term, supplying damping. During a changing command it also reacts to the commanded bank rate. This is different from the inner rate-P term, which acts on requested minus measured body roll rate. I left D_FF at zero for the January flight, but this gave me a way to add damping to the same basic structure.

ArduPlane's navigation still supplies the bank command from desired lateral acceleration:

```text
φ_cmd = atan(a_lat_cmd / g)
```

### Why this was close to the yaw-rate controller I wanted

The other part of the idea was the relationship between bank and turn rate. For a steady coordinated turn at airspeed V, heading rate ω is:

```text
ω = (g / V) tan(φ)
```

At small bank angles, tan(φ) ≈ φ, with φ in radians. At fixed speed, the commanded and actual bank angles therefore give:

```text
ω_cmd ≈ (g / V) φ_cmd
ω     ≈ (g / V) φ

φ_cmd − φ ≈ (V / g) (ω_cmd − ω)
```

Substituting that into the angle controller gives:

```text
u ≈ K_φ (V / g) (ω_cmd − ω)
  = K_ω (ω_cmd − ω)

K_ω = K_φ V / g
```

That was the useful discovery: **under the steady-turn approximation, the angle loop is mathematically equivalent to a proportional turn-rate loop with a rescaled gain.** I could use the bank-angle demand already produced by navigation, adjust the existing gains, and get something close to the yaw-rate behavior I had set out to implement.

Here ω means heading rate, the rate of turning in the horizontal plane. It is the navigation quantity I wanted to control; it is not generally identical to the body-axis yaw gyro reading. The equivalence uses steady coordinated motion and fixed speed. Around a larger steady bank angle φ₀, the local conversion becomes K_ω = K_φ V cos²(φ₀) / g.

## Hood River → simulation → Trout Lake

The first sustained flight at the Barrett Park RC field in Hood River used FF = 0.345 and no derivative feed-forward. Before Trout Lake, I tuned the workaround in our simple initial simulation model. Mission Planner recorded the experiments on February 14 and the morning of February 15, including trials with rate feedback, different angle time constants, and a wide range of feed-forward gains.

![Gain experiments and simulated response on the morning before Trout Lake](assets/flight-testing/sitl-lateral-tuning.png)

*These are recorded simulation runs. The mode trace identifies changes between GUIDED, AUTO and MANUAL while I adjusted the controller.*

The close-up below shows two AUTO runs from that morning. At FF = 2.0 and D_FF = 0.10, the simulated bank swings much more widely than in the selected FF = 1.0, D_FF = 0.05 run. Both traces also show that measured bank does not simply follow the navigation bank demand. The initial model was useful for exploring this behavior and choosing gains; flight testing was the next step.

![Commanded and simulated bank, with cross-track error, in two AUTO tuning windows](assets/flight-testing/sitl-bank-tracking.png)

*Two 45-second excerpts on February 15: 11:30:00 and 11:35:15 PST. The axes use the same scale. These are different portions of AUTO navigation, with different command histories, rather than identical repeated step inputs.*

By 11:37 a.m. I had returned to FF = 1.0 and D_FF = 0.05. I also used a one-second angle time constant, a 1 Hz target filter and a 30 deg/s requested roll-rate limit. Rate P, I and D were zero again. Compared with Hood River, the nominal angle gain was 2.9 times larger, with derivative damping added.

At my friend Collin’s house in Trout Lake that afternoon, I flew those settings without changing the lateral gains during the long flight. I deliberately reduced the loiter-radius setting from 60 to 40 metres, then to 30 metres, to explore tighter turns. The [flight-test article](flight-testing.md) shows the measured response to the first reduction. That sequence—first flight measurements, simulation tuning, then another flight—gave me a practical controller and evidence for what to improve next.

## Why I came back to a dedicated turn-rate controller

The shortcut got the aircraft flying missions, but it still used bank angle as a stand-in for the response I cared about. Looking back at the flights, I wanted to understand what changing the roll gains was actually doing to the turns. Simulation gave me a way to separate the steering loop from the navigation geometry and test that question repeatedly.

Increasing the roll-to-servo gain produced a stronger differential-brake correction. It did not give me independent control over turn-rate tracking and roll damping. During a turn entry or an oscillation, bank and heading rate do not follow the steady-turn relationship instantaneously. Changes in speed also change their relationship. Those are the places where the convenient mathematical equivalence stops describing the full dynamics.

I therefore returned to the yaw-rate-controller idea, implementing it as a dedicated **heading-rate controller**. It tracks the rate of turning directly, with differential-brake feed-forward, PI feedback, rate and acceleration limits, and a separate roll-rate damping term. That lets me tune how quickly the aircraft turns without using the same gain to stand in for all of its lateral motion. The replacement was developed and tested in SITL; the real flights described here used the original approach.

The mission plots also made me question the waypoint radius. We could make the response better damped and still overshoot the next track if the requested turn was too tight. I asked us to base the turn geometry on achievable turn rate, then optimize for tighter turns with less overshoot and repeat the comparison across wind and turbulence. Those experiments helped separate guidance geometry from the steering-loop tuning.

These earlier simple-model gains and navigation settings are listed in the [appendix](data-and-methods.md#lateral-controller-evidence).

![Mission controller comparison](../scratch/paraglider-tests/yaw-controller/mission-controller-comparison.png)

![Loiter controller comparison](../scratch/paraglider-tests/yaw-controller/loiter-controller-comparison.png)

In that earlier simulator, we ran the selected gains through the normal calm AUTO mission and controller handover test; both passed. Calm corner overshoot was approximately 0.31 m in the selected validation. Results are not universally robust: the 3 m/s steady-wind case exceeded the 4 m corner limit, and turbulence 0.5 caused altitude aborts with both controllers. Each wind condition had a single comparison flight. Failed tuning candidates are retained.

[Yaw validation and selected comparisons](../scratch/paraglider-tests/yaw-controller/validation.json) records the exact settings and limitations. I also explored a Lua quicktuner based on Plane autotune and the other tuning scripts, including L1 tuning. I decided it had not yet proven its value, so I kept its source and binding patches separately in provenance and out of the durable branch.

## Tuning the dedicated loop with separate canopy and payload motion

The simulator now has **nine mechanical degrees of freedom**: three shared translations, three payload rotations, and three canopy rotations. Two free rigid bodies would have twelve; the point joint removes three independent translations while allowing relative roll, pitch, and yaw. Rotor RPM and actuator states are additional dynamics, rather than extra canopy–payload mechanical freedoms.

This 9-DOF simulator changed the tuning problem. It represents the heavier Trout Lake configuration at 1.758 kg, with separate canopy and payload motion. The controller could follow a route while continuously shaking the payload. That became particularly clear when I returned to the throttle damper: some of the pitch motion I was trying to suppress was being driven by steering.

I limited the next study to two controller revisions and held the model coefficients fixed. Removing individual steering terms in successive settled windows pointed to heading-rate proportional feedback as the main source of fast excitation. Payload pitch-rate RMS dropped from about 16.5 to 3.3 degrees per second with that term removed; restoring the original settings brought the motion back. Removing roll damping or acceleration feedforward alone had much less effect.

The first revision reduced heading-rate P from 0.04 to 0.005 and roll damping from 0.03 to 0.003. Straight flight became much quieter, but a roughly 10-degree-per-second turn request now produced about 35 degrees per second. Removing the fast oscillation exposed excessive feedforward.

Steady-turn calculations gave equivalent feedforward gains of about 0.0056 left and 0.0123 right, including the asymmetric trim. I selected 0.009, left the integrator to correct the residual bias, and disabled heading-acceleration feedforward. Final sustained-turn tracking errors were 0.31 degrees per second right and 0.14 left, measured as RMS error over each phase's final 20 seconds.

### The current loop, one operation at a time

![Current heading-rate controller with separate roll-rate filtering, gain and speed scaling](assets/control-loops/current-lateral.png)

*The current native SITL candidate. Roll-rate feedback is expanded into its low-pass filter, damping gain, and airspeed scaling. It enters the output sum with a negative sign. The heading-rate P path is a different feedback term.*

Navigation still encodes its request as bank, but bank is no longer the feedback target. The code converts that request to heading rate using airspeed and, in automatic navigation, the heading/course projection. It limits the request to ±25 degrees per second, smooths it with a 0.1-second time constant, and limits its acceleration to 40 degrees per second squared.

The measured heading rate comes from the payload gyro and attitude:

```text
heading_rate = (q sinφ + r cosφ) / cosθ
error = shaped_heading_rate_target − filtered_heading_rate

u = clip[Sᵥ (0.009 × target + 0.005 × error − 0.003 × filtered_roll_rate) + I, −1, +1]
İ = 0.002 × error, with |I| ≤ 0.15 and conditional integration at output saturation
```

Rates here are in degrees per second. Both measured rates pass through 4 Hz low-pass filters. The airspeed multiplier is `Sᵥ = clamp(5 / max(Vair, 2), 0.25, 2.5)` for this configuration. The integral term is not multiplied by that scale. The normalized output passes through ArduPlane's brake mixer and servo mapping.

Here `p` is body-axis roll rate measured by the payload gyro. It is only approximately the Euler bank-angle rate `φ̇` near level attitude. In general, `φ̇ = p + (q sinφ + r cosφ) tanθ`. The damping path uses `p`, not that Euler-angle derivative. Its gain is labeled `K_RD`, alongside `K_FF`, `K_P`, and `K_I`; the separate `Sᵥ` block applies airspeed scaling.
This separates three jobs: feedforward supplies the expected brake input, heading-rate PI corrects tracking and trim error, and roll-rate feedback damps rocking. There is no roll-angle holding loop inside it. Heading-acceleration feedforward remains available in the implementation but is zero in this candidate.

### A mission that tracks without the repeated rocking

The revised lateral settings and the [longitudinal changes](longitudinal-observer.md#returning-to-native-mission-control) passed the existing native AUTO test, with its original altitude, corner, opposing-loiter, home-loiter and controller-handover checks unchanged.

![Settled bank motion and loiter radius across controller generations](../research/flight-log-analysis/figures/turn-model-spike/longitudinal-design/auto-loiter.png)

*The final 30 seconds of the first AUTO loiter. Purple is the current candidate; green is the 9-DOF model with original gains; red is an earlier conservative-gain trial. Older simple-model runs provide context, not a claim of equal model fidelity.*

First-loiter bank standard deviation fell from 2.60 degrees with the 9-DOF original gains to 0.039 degrees. Median radii were 26.74 and 26.68 m for the 25 m requests. Maximum corner overshoot was 0.66 m. The slightly wider circle and larger corner error were a worthwhile trade for much steadier motion. The same candidate remained well behaved with a softer roll model and at lower voltage; those checks did not include wind.

The progression is now clearer to me: the angle-controller workaround got the aircraft flying missions; direct heading-rate feedback separated steering from bank; the articulated model exposed how those corrections excited the payload. The latest gains are a simulator development candidate. The real Trout Lake flight still used the original angle workaround.

## What the linear analysis tells me

After getting the native mission controller to fly a much calmer route, I wanted to understand how much stability margin remained. I linearized the 9-DOF model at the Trout Lake straight, level trim: 1.758 kg, 4.383 m/s, 44.59% throttle, left brake released and right brake at 3.747 mm. That nonzero brake trim matters: small corrections stay on the right-brake branch rather than crossing the mixer’s change of side.

The local model keeps fourteen internal states after removing global position and heading. That is a state count, not fourteen mechanical degrees of freedom. Throttle and equilibrium rotor speed are held fixed for this lateral analysis. With differential brake command `u`, heading rate `ψ̇`, and body roll rate `p`, the plant is:

```text
Δẋ = A Δx + B Δu
Gψ(s) = Δψ̇/Δu = Cψ (sI − A)⁻¹ B
Gp(s) = Δp /Δu = Cp (sI − A)⁻¹ B

Gψ(0) = 98.00 deg/s per brake fraction
Gp(0) = −13.05 deg/s per brake fraction
```

A one-percent brake-command increment therefore produces about 0.98 deg/s of steady heading rate locally. Inverting that gain, including the speed multiplier, gives a feedforward gain of **0.00894**—almost exactly the 0.009 selected in the preceding nonlinear study.

![Linear plant Bode plots checked against nonlinear sine tests](../research/flight-log-analysis/figures/turn-model-spike/classical-lateral/plant-bode.png)

*The full plant has several coupled modes. Small-amplitude nonlinear sine tests match the sampled linear response within 0.005%; the slight difference from the continuous curve at high frequency is the input hold. This checks the linearization against the simulator.*

### Writing the feedback loop explicitly

At fixed speed scaling, below the command and actuator limits, the implemented controller becomes:

```text
e(s) = r(s) − H(s) ψ̇(s)
u(s) = S K_FF r(s) + [S K_P + K_I/s] e(s) − S K_RD H(s) p(s)

K_FF = 0.009; K_P = 0.005; K_I = 0.002; K_RD = 0.003
S = 5 / 4.383 = 1.1408
H(s) = 25.133 / (s + 25.133)       [4 Hz measurement filter]
r(s) = r_requested(s) / (0.1s + 1) [when command limits are inactive]

L(s) = H(s){[S K_P + K_I/s] Gψ(s) + S K_RD Gp(s)}
ψ̇(s)/r_requested(s) = Gψ(s)[S(K_FF + K_P) + K_I/s]
                       / {(1 + L(s))(0.1s + 1)}
```

The integrator is not speed-scaled. Feedforward affects command response but does not move the feedback poles. Also, body roll rate is not zero in every steady banked turn: `p = φ̇ − ψ̇ sinθ`. Roll-rate damping therefore supplies a small steady-turn correction as well as opposing oscillation.

### The poles explain why more P was not helping

The selected gains are locally stable, but the original larger feedback gains are unstable in this model. With the selected gains, a lightly damped pair sits at `−0.986 ± j15.969 s⁻¹`: about 2.54 Hz, with damping ratio 0.062. Scaling all feedback gains together reaches instability at **1.524 times nominal**, a gain margin of **3.66 dB**. Increasing heading-rate P alone reaches the boundary near 0.00791, with I and roll damping held fixed.

![Root locus annotated with physical mode participation and combined-loop zeros](../research/flight-log-analysis/figures/turn-model-spike/classical-lateral/annotated-root-locus.png)

*Crosses are open-loop poles, circles are combined-loop zeros, and green squares are the selected closed-loop poles. The mode labels come from eigenvector participation: several motions mix pitch, yaw, and translation. The red star marks the gain-induced instability boundary. The lower-half-plane branches mirror the upper half.*

The slow oscillatory plant mode mixes pitch and forward speed at about 0.34 Hz. Another mixes sideways velocity and canopy yaw around 0.59 Hz; the fastest pair is predominantly relative canopy/payload roll at 5.86 Hz. Feedback changes these coupled motions rather than merely adding damping to a single isolated roll mode.

Zeros need a different interpretation: they describe cancellation in an input–output response, not another natural motion. The combined loop has a right-half-plane zero pair at `+6.944 ± j19.054 s⁻¹`. The individual heading-rate and roll-rate plants have different zeros, so those cannot be substituted as endpoints of this root locus. [The separate pole–zero maps](../research/flight-log-analysis/figures/turn-model-spike/classical-lateral/plant-zero-map.png) show all of them. These are properties of the modeled plant, not modes or zeros identified directly from flight.

## Less feedback at the troublesome frequencies

The next experiment kept every gain and model coefficient fixed and changed only measurement filtering. I compared six filters across level flight, climb and descent at ±0.5 m/s, and level turns at ±10 deg/s. Two candidates stood out: lowering the existing low-pass cutoff from 4 to 1 Hz, and adding a broad notch at 2.5 Hz.

```text
1 Hz candidate: H₁(s) = 6.283 / (s + 6.283)
Notch candidate: H_N(s) = H(s) (s² + 6.283s + 246.740)
                              / (s² + 21.991s + 246.740)
```

Both retain unity DC gain. Feedforward bypasses the measurement filters, so reducing feedback near the troublesome modes need not make every turn command sluggish.

| Measurement filter | Level-flight gain margin | Lowest margin across five trims |
|---|---:|---:|
| Existing 4 Hz low-pass | 3.66 dB | 2.31 dB |
| 1 Hz low-pass | 8.41 dB | 6.87 dB |
| Broad 2.5 Hz notch | 14.83 dB | 7.04 dB |

![Feedback magnitude and sensitivity with six measurement filters](../research/flight-log-analysis/figures/turn-model-spike/lateral-shaping/shaping-bode.png)

*Both candidates reduce the sensitivity peak near the troublesome mode. The notch has the strongest straight-flight margin, but its advantage over the simpler filter narrows in left turns.*

Local command tracking stayed similar. I then ran eighteen nonlinear tests: level flight and both turn directions, each with three filters and either zero or 80 ms of added sensing delay. These used the actual modeled brake travel limits, asymmetric PWM mapping, changing speed scaling, and integral limits. The requested increments were 2 deg/s, continuing in the existing turn direction.

![Nonlinear command tracking and brake effort with zero and 80 ms sensing delay](../research/flight-log-analysis/figures/turn-model-spike/lateral-shaping/nonlinear-shaping.png)

*Solid lines have no added delay; dashed lines have 80 ms. The existing filter develops a large oscillation in the right turn, while both candidates keep tracking. The left-turn baseline remains well behaved, consistent with the asymmetric plant.*

In the delayed right-turn case, final-ten-second heading-rate RMS error was 26.65 deg/s with the existing filter, versus about 0.016 deg/s with either candidate. Without added delay, the 1 Hz filter’s integrated right-turn tracking error changed from 5.10 to 5.12 degrees over the 30-second run. The benefit is more tolerance of feedback phase lag, with little tracking cost in these tests.

### Taking the 1 Hz candidate through native SITL

I then ran the missing implementation trial: the full ArduPlane controller, estimator, navigation and altitude loops together. I compared `PG_TURN_FILT = 4` and `1` Hz in calm air, moderate repeatable gusts, and a steady 2 m/s eastward wind. All gains and model coefficients stayed fixed. The 1.758 kg Trout Lake model flew the same mission at 22.2 V, including altitude changes and clockwise and counterclockwise loiters. **All six native AUTO tests passed.**

| Condition | Right-turn heading-rate RMS error, 4 → 1 Hz | Left-turn heading-rate RMS error, 4 → 1 Hz |
|---|---:|---:|
| Calm | 0.36 → 0.26 deg/s | 0.39 → 0.31 deg/s |
| Moderate gusts | 9.93 → 9.66 deg/s | 9.43 → 10.44 deg/s |
| Steady crosswind | 2.39 → 1.93 deg/s | 3.75 → 3.25 deg/s |

These errors compare the requested rate with the unfiltered simulated payload heading rate, rather than rewarding the filter for making its own feedback signal smoother. Across the six settled-loiter comparisons, brake-command content above 1 Hz fell by **34–69%**. Radial tracking stayed essentially unchanged or improved slightly. In gusts, altitude RMS error remained around 0.41 m, and none of the settled loiters saturated the differential-brake command.

![Native 4 Hz versus 1 Hz filter comparison: heading-rate error, radial error and rapid brake-command activity](assets/lateral-native-filter/metrics.png)

*Blue is 1 Hz. Quieter commands are a consistent benefit; better heading-rate tracking is not universal. In particular, the gusty left turn had higher rate error even though radial tracking improved.*

![Native AUTO loiter-entry responses in calm air, gusts and crosswind](assets/lateral-native-filter/comparison.png)

*Matched settings, with each first-loiter entry aligned independently. Most of the remaining gust-driven rate error is below 1 Hz. Reducing high-frequency feedback does not remove that slower motion.*

I would use **1 Hz for the next SITL configuration, with the gains unchanged**. This is an incremental improvement, not a cure for gust response. These are single paired runs; the repeatable gust field has a different arrival phase when the trajectory changes. They also do not reproduce the earlier artificial 80 ms delay test or remeasure a stability margin. The existing mission videos and published default parameters still use 4 Hz. [Data and methods](data-and-methods.md#native-lateral-filter-trial) records the exact configurations, analysis and scope.

## Watching the two bodies move

After working through the mode shapes and controller plots, I wanted to see what those motions actually looked like. I built a Three.js viewer around the simulator's internal state and brought in my SolidWorks payload assembly. The canopy and payload now move independently, the servo capstans rotate as the brakes pull in, with black-and-white quadrants and an orange index stripe to make their motion visible, and the pusher propeller spins with the modeled motor RPM.

<video autoplay muted loop playsinline controls preload="metadata" width="1280" height="852" poster="assets/viewer/reversing-turn-controls-plain.jpg" aria-label="Simulated powered right turn, left reversal and brake release, with an articulated SolidWorks payload close-up">
  <source src="assets/viewer/reversing-turn-controls-plain.mp4" type="video/mp4">
  <source src="assets/viewer/reversing-turn-controls-plain.webm" type="video/webm">
  Your browser does not support inline video.
</video>

*Thirty seconds at real speed: a powered right turn, a reversal to the left, then brake release. This is a scripted open-loop run of the 9-DOF model at the 1.758 kg Trout Lake mass and 22.2 V. Moderate synthetic gusts act on the physics throughout, with nominal RMS speeds of 0.5 m/s in each horizontal direction and 0.25 m/s vertically. Peak payload bank is 36.2°. The left view follows the aircraft; the right rides with the payload so the mechanisms stay visible. Joint motion is shown at its actual simulated amplitude. [Download the clip](https://raw.githubusercontent.com/DavidIngraham/ArduPilot-tinkering/main/docs/assets/viewer/reversing-turn-controls-plain.mp4).*

The reversal is the interesting part. The payload and canopy do not behave like one rigid airplane, and brake release does not instantly erase their relative motion. In this run the largest relative rotation-vector components are 4.5° in roll, 11.4° in pitch, and 7.2° in yaw. Seeing that motion alongside brake travel makes the connection between the coupled modes and the physical aircraft much easier to follow.

The viewer can replay recordings or receive a live truth-state stream from the Python simulator running behind ArduPilot SITL. I can pause, scrub through a transition, change camera angles, and inspect joint angles alongside actuator inputs. All the physics stays in the simulator; the browser draws its results. This clip demonstrates the model and viewer, rather than an autonomous-controller test or a recreation of a recorded flight.

The payload geometry comes from CAD; the canopy and suspension lines are schematic. The [viewer source and setup guide](../viewer/README.md) cover the live connection and CAD export, and [data and methods](data-and-methods.md#articulated-flight-viewer) records how this clip was generated.

### The controller flies the mission

Next I connected the viewer to a full native ArduPlane SITL AUTO run. Here the mission supplies navigation targets, the heading-rate controller commands the brakes, and the longitudinal controller commands throttle. The aircraft's changing motion feeds back through the simulated sensors and estimator. I recorded the resulting state and actuator motion while the complete mission test ran.

The following three clips show the same mission segment and controller configuration: approach to mission item 3, a clockwise loiter requested at 25 m radius and 90 m altitude. Each runs for 55 seconds at real speed. Only the wind condition changes. The lower-left side profile unfolds the flight into distance travelled versus altitude, directly beneath the north-up ground track. All three use the same 85–95 m altitude scale, with a white dot marking the current position.

**Calm air**

<video muted loop playsinline controls preload="metadata" width="1280" height="852" poster="assets/viewer/auto-calm-profile-plain.jpg" aria-label="Calm-air native AUTO mission with ground track, altitude side profile, throttle history and brake pull">
  <source src="assets/viewer/auto-calm-profile-plain.mp4" type="video/mp4">
  <source src="assets/viewer/auto-calm-profile-plain.webm" type="video/webm">
  Your browser does not support inline video.
</video>

*With no wind, altitude stays between 89.45 and 90.11 m in the excerpt. Throttle ranges from 43.0% to 46.8%. [Download calm-air video](https://raw.githubusercontent.com/DavidIngraham/ArduPilot-tinkering/main/docs/assets/viewer/auto-calm-profile-plain.mp4).*

**Moderate synthetic gusts**

<video muted loop playsinline controls preload="metadata" width="1280" height="852" poster="assets/viewer/auto-gust-profile-plain.jpg" aria-label="Gusty native AUTO mission with ground track, altitude side profile, throttle history and brake pull">
  <source src="assets/viewer/auto-gust-profile-plain.mp4" type="video/mp4">
  <source src="assets/viewer/auto-gust-profile-plain.webm" type="video/webm">
  Your browser does not support inline video.
</video>

*The same controller now handles the repeatable gust field: nominal RMS 0.5 m/s north/east and 0.25 m/s vertically, with zero mean wind. Altitude ranges from 88.91 to 90.83 m and throttle from 39.9% to 52.9%. [Download gust video](https://raw.githubusercontent.com/DavidIngraham/ArduPilot-tinkering/main/docs/assets/viewer/auto-gust-profile-plain.mp4).*

**Steady crosswind**

<video muted loop playsinline controls preload="metadata" width="1280" height="852" poster="assets/viewer/auto-crosswind-profile-plain.jpg" aria-label="Native AUTO mission in steady 2 m/s eastward wind with ground track, altitude side profile, throttle history and brake pull">
  <source src="assets/viewer/auto-crosswind-profile-plain.mp4" type="video/mp4">
  <source src="assets/viewer/auto-crosswind-profile-plain.webm" type="video/webm">
  Your browser does not support inline video.
</video>

*A steady 2 m/s wind blows east, with no gusts. It is a crosswind on north/south legs; its headwind, tailwind and crosswind components change around the loiter. Altitude ranges from 89.22 to 90.22 m and throttle from 42.9% to 46.9%. The full native AUTO test also passed in this condition. [Download crosswind video](https://raw.githubusercontent.com/DavidIngraham/ArduPilot-tinkering/main/docs/assets/viewer/auto-crosswind-profile-plain.mp4).*

In the gust clip, the turn entry reaches 16.9° of payload bank. The controller continues correcting for the changing air velocity while the canopy and payload move relative to each other. Peak relative rotation-vector components in this excerpt are 3.4° in roll, 12.9° in pitch and 6.6° in yaw. The wind flag points downwind on a north-up compass, with horizontal speed and a separate up/down vertical-wind readout. It uses the same earth-frame wind vector that drives the physics, not aircraft-relative airflow. The articulation is not an added animation.

With the same synthetic gust settings as the scripted clip, the full gust run passed the existing AUTO regression, including its altitude changes, corner checks, opposing two-turn loiters, home loiter and controller handover. This excerpt uses the heading-rate controller throughout; it ends well before the handover test. The native log confirms AUTO mode throughout the clip. The model uses constant 22.2 V and the 1.758 kg Trout Lake configuration, with an airborne start. These are repeatable synthetic gusts with zero mean wind, not a recreation of measured weather. The earlier calm-air run also passed. [Reproduction and recording checks](data-and-methods.md#native-auto-mission-video) accompany the clip.

The earlier damper-off video exposed a weakness that the mission pass did not capture. Payload pitch swings from −11.7° to +26.3°, with a dominant frequency near 0.36 Hz (a 2.75-second period). Climb rate ranges from −1.41 to +1.34 m/s. Height error remains between −0.81 and +1.49 m, so the mission test passes while the aircraft visibly rocks. This is adequate route completion, but poor longitudinal disturbance rejection. The [longitudinal comparison](longitudinal-observer.md#what-the-gust-video-exposed) separates those two outcomes.

The [longitudinal chapter](longitudinal-observer.md) picks up the same experiment from the throttle side. [Data and methods](data-and-methods.md#lateral-controller-evidence) preserves the earlier tuning records. The [current plotting source](../research/flight-log-analysis/scripts/native-sitl/), [figure manifest](../research/flight-log-analysis/manifest.json), and [diagram generator](../tools/draw_control_loops.py) preserve this update. Native implementation and reproduction instructions are recorded at ArduPilot commit `2588ecc44a` on `paraglider-high-dof-control`.

All three clips use the improved controller from the [gust-control study](longitudinal-observer.md#shaping-the-damper-around-the-gust-response): pitch-rate throttle damping with two 1.5 Hz low-pass stages. During the gust excerpt, pitch standard deviation is 6.78°, climb-rate RMS is 0.44 m/s, and throttle ranges from 39.9% to 52.9%. The study compares complete native AUTO flights against the earlier damper-off baseline. All the videos include a ten-second throttle-command history on a fixed 0–100% scale and left/right actual brake-pull bars on the same 0–100 mm scale. Zero means released. The common scale preserves the real left/right asymmetry alongside the rotating capstans.
