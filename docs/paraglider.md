# What does my paraglider need from its controller?

My first approach was to reuse ArduPlane's roll controller. I wanted the existing navigation system to command turns through differential braking, without first writing a new lateral controller. Looking through the controller blocks, I realized that its rate feed-forward path could serve as an angle controller if I turned off the inner rate-feedback gains.

That was the starting point for the real flights. Later, the simulation work led to a dedicated heading-rate controller, achievable-turn-radius guidance, and a model of canopy–payload pitch motion. The [flight-test post](flight-testing.md) covers the aircraft tests; this page follows the lateral-control reasoning from the original shortcut to the replacement controller.

## The first approach: turn rate feed-forward into angle control

My January 30 notebook page compares the standard ArduPlane loops, the first-flight configuration, a paramotor controller from the ACRA paper, and a simplified version of my own. In the first-flight diagram I crossed out the rate P, I, and D paths. The key annotation on the simplified diagram is “essentially φ P gain.”

![Original lateral-control analysis comparing ArduPlane, the first-flight configuration, and the simplified angle controller](assets/micro-agu/lateral-control-notes.png)

*January 30 control-law notes: keep the navigation and angle-error calculation, then use rate feed-forward to drive the brakes.*

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

The lower notebook sketch also explores a derivative path. If derivative feed-forward is enabled, it differentiates the requested rate—which already contains bank-angle error. At fixed scaling, its contribution reduces to:

```text
u_DFF = [F K_DFF S / (E τ)] d(φ_cmd − φ)/dt
```

For a steady bank command this becomes a negative bank-rate term, supplying damping. During a changing command it also reacts to the commanded bank rate. This is different from the inner rate-P term, which acts on requested minus measured body roll rate. The January flight had D_FF set to zero; the sketch shows how damping could be added to the basic angle-control shortcut.

ArduPlane's navigation still supplies the bank command from desired lateral acceleration:

```text
φ_cmd = atan(a_lat_cmd / g)
```

That preserves the existing path-following interface. The shortcut makes the brakes respond to bank error; it does not directly regulate heading rate. Its effectiveness depends on the parafoil's relationship between differential brake, bank, and turn rate. That distinction motivated the next controller.

## Is the roll controller the right abstraction?

In simulation, increasing the roll-to-servo gain increased the differential-brake correction produced by this angle loop. That made the aircraft turn more strongly, but the quantity I ultimately wanted to control was its rate of turning. I wanted to see whether a dedicated turn controller would make the behavior easier to understand and tune. We implemented and manually tuned a replacement that tracks heading rate directly, with differential-brake feedforward, PI feedback, rate/acceleration limits and coupled roll-rate damping. Feature guards keep paraglider-specific code out of standard builds; legacy/mode handover is tested.

The mission plots also made me question the waypoint radius. We could make the response better damped and still overshoot the next track if the requested turn was too tight. I asked us to base the turn geometry on achievable turn rate, then optimize for tighter turns with less overshoot and repeat the comparison across wind and turbulence. Those experiments helped separate guidance geometry from the steering-loop tuning.

The gains we selected for this SITL model are `PG_TURN_RMAX=25`, `FF=0.051`, `P=0.04`, `I=0.002`, `IMAX=0.15`, `ACCEL=40`, `FILT=4`, `TC=0.1`, `ASPD=5`, `RDAMP=0.03`, `D_FF=0.02`. They accompany `NAVL1_PERIOD=8`, `NAVL1_DAMPING=1`, `WP_RADIUS=22` and `WP_LOITER_RAD=25`. These are model-specific engineering selections, not general flight recommendations.

![Mission controller comparison](../scratch/paraglider-tests/yaw-controller/mission-controller-comparison.png)

![Loiter controller comparison](../scratch/paraglider-tests/yaw-controller/loiter-controller-comparison.png)

We ran the selected gains through the normal calm AUTO mission and controller handover test; both passed. Calm corner overshoot was approximately 0.31 m in the selected validation. Results are not universally robust: the 3 m/s steady-wind case exceeded the 4 m corner limit, and turbulence 0.5 caused altitude aborts with both controllers. Each wind condition had a single comparison flight. Failed tuning candidates are retained.

[Yaw validation and selected comparisons](../scratch/paraglider-tests/yaw-controller/validation.json) records the exact settings and limitations. I also explored a Lua quicktuner based on Plane autotune and the other tuning scripts, including L1 tuning. I decided it had not yet proven its value, so I kept its source and binding patches separately in provenance and out of the durable branch.

## What fidelity does the simulator need?

When the simulated yaw response oscillated, I wanted to understand whether additional damping could be explained by a higher-fidelity model. Without flight data to identify it, we chose a provisional damping term and added propeller torque reaction. The canopy model builds on [Umenberger and Göktogan, ACRA 2012](https://www.araa.asn.au/acra/acra2012/papers/pap151.pdf). Added yaw damping (`Cnr=-0.05`) is an effective provisional term, and propeller torque reaction uses a provisional −0.02 m torque/thrust ratio. Neither is identified from flight logs. Higher-fidelity canopy/payload coupling can contribute apparent damping, but does not establish these numerical values.

My flight testing raised a more pressing issue: the longitudinal canopy/payload hinge was tricky, and my throttle pitch damper caused enough self-excitation that I zeroed it out. My thrust line is below the hinge, with the CG below that. I asked us to add the joint to SITL and investigate the coupling before the flight logs were available.

The optional pitch joint we implemented separates canopy and payload pitch, with coupled inertias, translation and thrust moment. The payload IMU acceleration includes the moving lever-arm contribution. Roll/yaw remain shared; this is not a complete multibody parafoil model. Representative settings are total mass 1.55 kg, canopy 0.19 kg, payload 1.36 kg, inertias 0.025/0.03 kg m² and joint damping 0.015 N m per rad/s. The payload CG is 0.35 m below the hinge. The modeled thrust line is 0.10 m above that CG, hence still 0.25 m below the hinge.

Pitch-sign conventions and aerodynamic blending were corrected during the experiments. Earlier directories explicitly marked before the aero-sign correction are historical results. The 15-degree linear-aerodynamic boundary and high-angle blend are numerical approximations, not a validated stall or collapse envelope.

The native `ParagliderPitchJoint` test and 20 model unit tests passed; the rigid-model extended AUTO test remains part of normal coverage. Local articulated AUTO runs completed, but those use different configurations and should not be pooled with lateral comparisons. [Physics review](../scratch/paraglider-tests/pitch-joint/physics-review/summary.json) records the model assumptions and trim analysis.

## Can the launch start in the right physical state?

My actual launch starts with both payload and canopy upside down. I hold the bottom of the payload, lay the canopy out in a crescent, swing it overhead in about a second, walk two steps once it is inflated, and give it a light toss. I let it glide for about a second before throttling up. I wanted that sequence represented because the release state could matter to the oscillations we were trying to control.

We explored that sequence with provisional geometry and timing. A 1.0 s swing looked more promising than 0.8 or 1.2 s for release orientation, but about 39% of the held trajectory required compression in the assumed suspension constraint. That invalidates a taut-line rigid interpretation of actual inflation. This is a design study, not a validated launch simulation.

![Inverted swing study](../scratch/paraglider-tests/pitch-joint/swing-launch/inverted-launch.png)

The durable SITL throw guide is a synthetic initialization aid; it does not implement the overhead inflation sequence. The model assumes an inflated canopy and does not simulate slack lines, inflation or collapse. [Swing results](../scratch/paraglider-tests/pitch-joint/swing-launch/inverted-results.json) retain the checks and assumptions.

## Where that leaves my control questions

The result I find most useful is that relative canopy/payload pitch rate provides damping information unavailable to a payload-only pitch loop. Truth-state controllers demonstrate potential, but an observer and robust protection still need development. See [longitudinal control and observer design](longitudinal-observer.md). The [real-flight analysis](flight-testing.md) now provides measured oscillations and damper transitions to reproduce as the model is calibrated.

## Original analysis and implementation

The controller sketch is from page 323 of my notebook. The Hood River parameter values come from the January 3 onboard log. The algebra follows [`AP_RollController::get_servo_out`](https://github.com/DavidIngraham/ardupilot/blob/0f1121f32035d218c624fa7e110a124fd7fc6263/libraries/APM_Control/AP_RollController.cpp), [`AP_FW_Controller::_get_rate_out`](https://github.com/DavidIngraham/ardupilot/blob/0f1121f32035d218c624fa7e110a124fd7fc6263/libraries/APM_Control/AP_FW_Controller.cpp), and [`AC_PID`](https://github.com/DavidIngraham/ardupilot/blob/0f1121f32035d218c624fa7e110a124fd7fc6263/libraries/AC_PID/AC_PID.cpp) at the revision reported by that log. The numerical example holds speed scaling constant and stays below output limits.
