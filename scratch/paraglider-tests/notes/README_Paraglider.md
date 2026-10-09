# Powered paraglider SITL model

`paraglider` is a six-degree-of-freedom model of an already inflated canopy
rigidly attached to its suspended motor/payload. `paraglider-throw` and
`paraglider-tow` add a simulated launch force, triggered by servo output 7
above 1700 PWM. They do not simulate canopy inflation or a towline.

The geometry and baseline coefficients originate from Umenberger and Göktoğan,
[Guidance, Navigation and Control of a Small-Scale Paramotor](https://www.araa.asn.au/acra/acra2012/papers/pap151.pdf),
ACRA 2012. The model contains additional empirical damping and a bounded
high-angle aerodynamic blend. Its coefficients have not been validated against
the user's vehicle. A successful SITL mission validates software integration,
not physical accuracy.

## Brake equations and units

The canopy reference area is `A_para_m2` in square metres. `b_span_m` and
`d_brake_m` are lengths in metres. Brake deflections are radians, and all
`CL_da`, `CD_da`, `Cl_da` and `Cn_da` coefficients are dimensionless
derivatives per radian. Body axes are forward/right/down.

Following equations 20–21, the direct brake force is proportional to
`0.5 * density * speed * area` times a vector containing velocity components
and brake derivatives. The result scales with **speed squared**, not cubed.
In forward flight at zero canopy angle of attack, braking produces negative
x drag and negative z lift. The maximum left/right deflection determines this
force; symmetric and asymmetric force contributions remain an approximation.

Following equation 22, the direct asymmetric moment uses
`0.5 * density * speed^2 * area * span^2 / brake_length`
times the roll/yaw derivatives and `(right - left) / 2`. The `span^2 / brake_length`
factor supplies a length, so the result is in newton metres. Swapping the
brakes reverses this moment; equal braking cancels the direct asymmetric moment.
Force lever arms can still produce other moments.

These factors correct earlier speed-cubed brake forces and a missing span
factor in the direct brake moment. Existing custom coefficient files tuned
against those earlier equations require revalidation; retaining their numeric
coefficients does not retain their previous response.

## Model and integration tests

With the normal ArduPilot SITL development dependencies installed:

```sh
./waf configure --board sitl
./waf plane --targets tests/test_paraglider
build/sitl/tests/test_paraglider
Tools/autotest/autotest.py test.Plane.ParagliderFlight
Tools/autotest/autotest.py test.Plane.ParagliderAutoMission
Tools/autotest/autotest.py test.Plane.ParagliderDynamics
```

`ParagliderFlight` uses the throw assist, climbs, maintains flight in FBWB,
checks left and right turns, and flies an AUTO route with 40/60/40 metre
waypoint altitude demands followed by a home loiter. It checks waypoint
progress, altitude, proximity to home, finite attitude and armed state.
It restarts SITL at the end; it does not validate landing.

`ParagliderDynamics` starts from an 80 metre launch and records:

| Phase | Command | Duration in simulation time |
| --- | --- | --- |
| `trim_fbwb` | Neutral FBWB sticks | 15 seconds |
| `trim_manual` | MANUAL, mean trim throttle PWM | 10 seconds |
| `throttle_step` | Trim throttle +100 PWM | 10 seconds |
| `throttle_recovery` | Trim throttle | 10 seconds |
| `left_brake_step` | RC1=1400, trim throttle | 5 seconds |
| `brake_recovery` | RC1=1500, trim throttle | 10 seconds |

The benchmark writes `ParagliderDynamics.csv` in the autotest buildlogs
directory. Columns contain simulation time, relative altitude, reported
airspeed and groundspeed, climb rate, roll/pitch/yaw rate, and brake/throttle
output PWM. The configured model has no airspeed sensor, so reported airspeed
must not be assumed to be independent ground truth. Each row combines
successively received telemetry messages rather than a synchronized sample.

The test requires finite data, flight altitude above 20 metres, an increase in
mean climb rate during the throttle step, and negative mean yaw rate during the
left-brake step. It uses a fixed speedup of 10. Compare phase means and response
traces when changing the model, retaining vehicle parameters, wind settings,
coefficient file, software revision and launch conditions with the results.

## Remaining fidelity limits

The model has no explicit apparent mass or canopy/payload relative motion.
Brake-dependent stall, inflation, collapse and recovery are not modeled.
The high-angle lift/drag blend is a numerical approximation and is not a
validated stall polar. Thrust is linear in normalized throttle. Generic SITL
servo filtering and wind are inherited from `Aircraft`.

Measured trim, throttle and brake responses from the actual vehicle are needed
to calibrate these defaults and assess which additional dynamics are useful.

## Lateral-mode isolation experiments

Run the exploratory matrix through the native flight-test framework:

```sh
Tools/autotest/autotest.py test.Plane.ParagliderYawExperiments
```

The full matrix includes the additional `no_yaw_damping`, `no_prop_torque` and
`reverse_prop_torque` cases. `ParagliderYawDefaults` runs only those three plus
the baseline as a focused check of the provisional defaults.

Each case restarts SITL with a separate coefficient file, launches to 100 metres,
settles in FBWB, then switches to MANUAL at 1442 PWM throttle. Wind and turbulence
are zero. Record 10 seconds before excitation, a 0.5 second RC1 pulse, and
30 seconds after release to RC1=1500. The default pulse is RC1=1450. This fixed
throttle is a baseline operating point, not a trim solve for each modified model.

| Case | Intervention | Question |
| --- | --- | --- |
| baseline / repeat | Defaults, repeated launch | Is the response repeatable? |
| no_pulse | RC1 stays at 1500 | How much launch residual remains? |
| mirror | RC1=1550 pulse | Does reversing the input reverse the response? |
| yaw_damping | `aero.Cnr=-0.1` | Does direct yaw damping attenuate the mode? |
| no_inertia_coupling | `Ixz=0` | Is product-of-inertia coupling essential? |
| no_roll_restoring | `aero.Clphi=0` | Does the explicit roll restoring term set its frequency? |
| double_roll_damping | Roll damping 1.2 Nm/(rad/s) | How sensitive is decay to roll damping? |
| no_roll_damping | Roll damping zero | Does aerodynamic damping alone suffice? |
| rate_600 / rate_2400 | Physics rate 600 / 2400 Hz | Does period/decay converge with timestep? |
| instant_servo | `SIM_SERVO_SPEED=0` | Is servo slew responsible for the response? |

The test writes `ParagliderYaw-<case>.csv` and a JSON configuration sidecar in
buildlogs. SIMSTATE supplies true attitude and body angular rates; ATTITUDE
supplies estimated yaw rate. Position/velocity and output PWM come from separate
telemetry messages. Message rates are requested at 20 Hz; actual sample timing
must be checked in the CSV. Samples are sequential, not exactly simultaneous.
The records include relative altitude and finite-value checks throughout flight.

Coefficient overrides are diagnostic interventions, not calibrated replacements.
These experiments identify model behavior; they cannot validate a real vehicle's
modal damping or frequency. Relative canopy/payload twist is absent from this
rigid-body model, so that mode cannot be inferred from its oscillations.

SITL maps filesystem paths relative to its working directory. Supply relative
paths for coefficient files (the experiment harness converts its temporary file
paths), rather than assuming an absolute host path will work.

### Initial isolation results (6 October 2026)

These historical results used `Cnr=0` and no propeller reaction torque, before
the provisional defaults described below were introduced. All 12 cases completed
through the native autotest framework. At approximately
4.94 m/s groundspeed, baseline and repeat release traces fit a damped sinusoid
with period 1.686 s and amplitude decay rate 0.089/s (11.2 s e-folding time).
The fit includes constant and linear drift and uses 1–20 seconds after release.
Baseline fit R-squared is 0.981. True body roll rate lags true body yaw rate by
about 84 degrees; their fitted amplitudes are both approximately 3.3 deg/s,
whereas pitch rate at that frequency is approximately 0.011 deg/s.

| Intervention | Observed response |
| --- | --- |
| Repeat / mirrored pulse | Same period and decay; mirror reverses the response |
| No pulse | Small residual: early release yaw-rate standard deviation 0.072 deg/s versus 1.965 deg/s for baseline |
| `Cnr=-0.1` | Period 2.347 s, decay rate 0.721/s; early standard deviation 0.126 deg/s |
| `Ixz=0` | Long-lived yaw oscillation disappears; no meaningful multi-cycle period is assigned to the fast remaining transient |
| `Clphi=0` | Oscillation remains, period 1.732 s; also develops a slowly changing turn-rate bias |
| Twice added roll damping | Period 1.604 s, decay rate 0.262/s (3.8 s e-folding time) |
| No added roll damping | Large sustained nonlinear oscillations reach approximately 105 deg/s; small-signal damping estimates are inappropriate |
| Physics 600 / 1200 / 2400 Hz | Periods 1.6848 / 1.6858 / 1.6863 s; decay rates 0.0902 / 0.0890 / 0.0882 per second |
| Instant servo | Period 1.6845 s, decay rate 0.0846/s; actuator slew is not the source of the repeated oscillation |

All release records after the first second had both brake outputs at 1100 PWM.
The default mode is therefore an excited, decaying physical-model response,
not sustained alternating brake control. Product-of-inertia coupling and damping
are important to its yaw signature. The explicit roll-angle restoring coefficient
alone does not explain its frequency. Force lever arms and lateral translation
remain part of the coupled dynamics; those terms have not been individually
removed in this matrix. A local eigenanalysis is still needed for a formal modal
classification. "Dutch-roll-like rigid-body lateral mode" is an appropriate
working description, rather than a validated real-vehicle mode identification.

The fixed throttle does not re-trim every intervention. Most cases retain similar
speed and altitude; the no-added-damping case loses substantial altitude and
leaves the linear regime. Sequential telemetry also introduces a small timing
offset between truth, estimated rates and velocity. Period and decay estimates
are descriptive fits, not confidence-bounded system identification results.

### Relation to published modes

[Van der Kolf, *Flight Control System for an Autonomous Parafoil* (2013)](http://hdl.handle.net/10019.1/85757)
analyzes a parafoil lateral complex pole pair as Dutch roll, with coupled yaw,
roll and sideslip, while separately identifying a payload-relative twist mode.
Its vehicle and multibody model differ from this SITL model; matching a qualitative
motion or timescale does not validate our coefficients.

[Zeng et al., *Nonlinear Multibody Dynamics of a Powered Parafoil Vehicle Using Kane's Equations: Directional Asymmetry and Dutch-Roll* (2026), sections 4.3–4.4](https://doi.org/10.3390/aerospace13090784)
studies Dutch-roll eigenvalues around powered-flight trim states and how thrust,
directional input and configuration affect damping. This supports using matched
trim, perturbation experiments and eigenanalysis rather than assigning damping
from a single maneuver trace.

[Gorman and Slegers, *Evaluation of Multibody Parafoil Dynamics Using Distributed Miniature Wireless Sensors* (2012)](https://doi.org/10.2514/1.C031566)
measures a payload twist mode at 1.05 Hz and compares it with a 1.03 Hz simulated
mode. That relative canopy/payload motion is a separate phenomenon and is absent
from our rigid model.

[Slegers, *Effects of Canopy-Payload Relative Motion on Control of Autonomous Parafoils* (2010)](https://digitalcommons.georgefox.edu/mece_fac/9/)
shows that payload-relative yaw can produce persistent oscillations under a
turn-rate controller which a model neglecting that relative motion misses.
This is a reason to consider a future relative-yaw degree of freedom, not an
explanation for an oscillation already present in rigid-body MANUAL flight.

The next useful calibration data are matched-trim left/right brake singlets
from the real vehicle, synchronized IMU/GNSS and brake-position records, and,
if feasible, separate canopy and payload angular-rate measurements. Those can
separate rigid-body lateral motion from relative twist and constrain both direct
yaw damping and the empirical roll damping before changing the default model.


## Provisional defaults for control-law evaluation

Without flight-test data, the model uses `aero.Cnr=-0.05` as a provisional
constant effective yaw-damping derivative. This is half the `-0.1` diagnostic
intervention above, retaining a transient response while adding direct damping.
The convention is:

```text
N_yaw = dynamic_pressure * canopy_area * span * Cnr * (yaw_rate * span / (2 * airspeed))
```

`Cnr` is dimensionless, with yaw rate in rad/s. Negative values dissipate
rotational energy for either rotation direction. Existing force-offset damping
and the added roll damping remain; `Cnr` is not a replacement for those terms.

The model also applies a propeller reaction moment about body X, independently
of the existing thrust-offset moment:

```text
M_prop_x = prop_torque_per_thrust_m * thrust_N
```

The nominal ratio is `-0.02` m (Nm/N), giving -0.2 Nm at 10 N maximum thrust.
Its negative sign represents reaction to propeller rotation about positive
body X; reversing the sign reverses the reaction. This is an illustrative
small-vehicle assumption, not a measurement or a transfer of the coefficient
from Zeng et al.'s larger propulsion unit. The proportional-to-thrust form follows
that paper's equations 34–35. Propeller gyroscopic effects and independent motor
spool dynamics are not added.

Both defaults can be overridden using the existing model JSON loader:

```json
{
  "aero": {"Cnr": -0.05},
  "prop_torque_per_thrust_m": -0.02
}
```

Set the ratio to zero to disable reaction torque, or positive to reverse its
sign. Set `Cnr=0` and the ratio to zero to reproduce the earlier lateral baseline.
Controllers should also be evaluated with weaker/stronger yaw damping and
both propeller directions rather than relying on these uncalibrated nominal
values. The focused flight comparison is:

```sh
Tools/autotest/autotest.py test.Plane.ParagliderYawDefaults
```


The focused nominal/disabled/reversed flight comparison measured a roughly
1.99 s period and 1.1 s amplitude-decay time at the nominal damping. In MANUAL
flight at 1442 PWM throttle, nominal reaction torque gives about -1.18 degrees
of bank and -1.92 deg/s body yaw rate after the transient. Reversing the torque
ratio reverses both biases; disabling torque leaves them approximately zero.
With yaw damping disabled but reaction torque retained, the approximately
1.69 s lightly damped oscillation remains around a larger turning bias. These
are simulation measurements, not real-vehicle validation.

The AUTO smoke test estimates its first-waypoint approach timeout from initial
navigation distance and cruise airspeed, plus a turn-acquisition allowance.
This accounts for the different distance traveled during the preceding brake
turns while retaining the waypoint, altitude and home-loiter requirements.


## Extended AUTO mission

`ParagliderAutoMission` complements the shorter smoke test. It launches to
60 metres, settles in FBWB and then flies this AUTO route, with all horizontal
coordinates in metres north/east of home and altitudes relative to home:

| Item | Command | North | East | Altitude | Loiter |
| --- | --- | --- | --- | --- | --- |
| 1 | Waypoint | 250 | 0 | 60 | |
| 2 | Waypoint | 650 | 0 | 90 | |
| 3 | Loiter turns | 650 | 400 | 90 | Two clockwise circles, 60 m radius |
| 4 | Waypoint | 250 | 400 | 60 | |
| 5 | Waypoint | 250 | 0 | 45 | |
| 6 | Waypoint | -150 | 0 | 45 | |
| 7 | Waypoint | -150 | -400 | 75 | |
| 8 | Loiter turns | 250 | -400 | 75 | Two counter-clockwise circles, 60 m radius |
| 9 | Waypoint | 650 | -400 | 55 | |
| 10 | Waypoint | 650 | 0 | 55 | |
| 11 | Waypoint | 250 | 0 | 60 | |
| 12 | Unlimited loiter | 1 | 1 | 60 | Clockwise, 60 m radius |

The straight segments total approximately 4.5 km from home, with additional
travel for the four commanded circles, acquisition and final loiter. The route
contains both left/right turns, long straight segments, climbs and descents.
It uses the provisional yaw damping and propeller reaction torque defaults,
zero wind/turbulence and a fixed speedup of 10.

The test checks sequential mission progress, armed state and AUTO mode at
checkpoints. `WP_RADIUS=40` and `WP_MAX_RADIUS=0` use normal Plane waypoint
acceptance, including finish-line advancement, without forcing tight proximity.
Closest approach is recorded as a diagnostic metric rather than used as a
strict distance assertion. Altitude must remain within 12 metres of the waypoint
demand at the closest observed approach. Loiter checks retain their 60 m radius.

GPS bearing around each finite loiter centre must accumulate at least 1.5 turns
in the commanded direction while within 30–100 metres of that centre. The mission
itself commands two turns; the observation threshold allows for orbit entry and
exit. Finite attitude and a 20–130 metre altitude envelope are checked continuously.
The final home loiter must remain within 90 metres of home for 30 seconds and
then maintain 48–72 metres altitude for 15 seconds. No landing is attempted.
Per-item timeouts account for approach distance, turn acquisition and loiter time.

The test saves `ParagliderAutoMission.csv` and a JSON sidecar in buildlogs, even
if a flight assertion fails. They contain the GPS track, mission item, relative
altitude, distance to target, groundspeed, attitude/yaw rate and output PWM,
plus route geometry, closest-approach metrics and signed loiter angular travel.
Telemetry fields are asynchronous. These records support comparing control-law
changes against the same mission without treating a pass as physical validation.


The initial extended run, using the earlier `WP_RADIUS=15` and
`WP_MAX_RADIUS=35` settings, completed all 12 items in approximately 1519 seconds
(25.3 minutes) of simulated AUTO flight and traveled approximately 7.5 km,
including orbit acquisition, turns and final loiter. Recorded altitude ranged
from 44.42 to 90.74 metres. At the nine waypoint closest approaches, maximum
horizontal error was 20.1 metres and maximum altitude error was 1.44 metres.
Observed angular travel near the two finite loiters was +2.43 and -2.11 turns,
confirming clockwise and counter-clockwise circulation respectively. These
measurements are descriptive results for the provisional model defaults.


The repeat with `WP_RADIUS=40` and `WP_MAX_RADIUS=0` also passed all 12 items,
both loiter directions and the sustained home-loiter checks. It completed
approximately 1481 seconds (24.7 minutes) of simulated AUTO flight and traveled
7.32 km, about 38 seconds and 189 metres less than the tighter-radius run.
Maximum waypoint altitude error at the observed closest approaches was 1.77 m.
The largest recorded closest-approach distance was 50.9 m; finish-line
advancement can occur outside `WP_RADIUS` when `WP_MAX_RADIUS` is zero.


## L1 guidance damping

The paraglider defaults now use `NAVL1_DAMPING=0.85` and `NAVL1_PERIOD=17` seconds.
The damping change is in the navigation controller configuration; aerodynamic
yaw damping, propeller torque and waypoint/loiter radii are unchanged.

A native `ParagliderL1Damping` diagnostic runs the extended mission with an
explicit 0.85 damping override. The common mission helper also accepts an
`l1_damping` override for parameter comparisons, and the JSON sidecar records
the effective L1 damping and period. CSV records now also include L1's demanded
bank angle and reported cross-track error. The aircraft's measured track and
attitude remain separate observations.

The initial 0.75 versus 0.85 comparison used a 17-second period, 40 m waypoint
radius and no maximum-radius constraint. Across straight legs 2, 4, 5, 6, 7, 9,
10 and 11, evaluate signed perpendicular error to the nominal line between
successive command centres. Restrict evaluation to samples 80 m or more from
each end of the 400 m leg to reduce the contribution from acquisition and corner
transients. The first mission approach and finite loiters are excluded.

| Metric on central straight-leg portions | Damping 0.75 | Damping 0.85 |
| --- | --- | --- |
| Cross-track RMS | 16.50 m | 11.06 m |
| 95th percentile absolute cross-track error | 39.52 m | 26.23 m |
| Maximum absolute cross-track error | 51.47 m | 43.08 m |
| Total simulated AUTO duration | 1480.5 s | 1517.9 s |
| Total distance traveled | 7.32 km | 7.50 km |

RMS error decreased on each of the eight evaluated legs. The stronger damping
reduces the observed weaving. Total mission time and distance also depend on
initial approach and orbit acquisition, so they are not standalone damping
metrics. The nominal look-ahead distance also increases with damping;
this is not an isolated change to a single feedback gain. Both missions passed
all flight checks. These are descriptive comparisons for the provisional model,
not a measurement of the closed-loop damping ratio or a guarantee of optimal
tracking. Some residual curvature remains.


A further standard `ParagliderAutoMission` run with 0.85 loaded from the defaults
file before takeoff also passed. Central-leg cross-track RMS was 11.15 m, the
95th percentile absolute error was 25.88 m, and the peak was 43.09 m. RMS improved
on each evaluated leg relative to the earlier 0.75 baseline. This run completed
1450.7 seconds of AUTO flight and traveled 7.17 km. The difference in total travel
from the override run illustrates the contribution of initial approach geometry;
the central-leg error improvement was consistent in both runs.
