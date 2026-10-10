# A Calmer Parafoil: Getting the Controllers to Work Together

*10 October 2026 · Micro-AGU development notes · [The flight story](flight-testing.md) · [Throttle and pitch](longitudinal-observer.md)*

I came back to longitudinal control with a fairly specific question: could I reproduce the oscillation associated with the bad pitch-damper sign, reverse the sign, and get a better-behaved aircraft?

That turned into a more useful investigation than a sign change. In the higher-degree-of-freedom simulator, the steering controller was continuously exciting the payload. Once I reduced that motion, two other problems became obvious: excessive steering feedforward and a throttle kick when capturing altitude. Fixing those produced a much calmer mission controller, with the pitch damper left off.

These results come from native ArduPilot software-in-the-loop tests. The simulator represents the heavier Trout Lake configuration, at 1.758 kg, with separate canopy and payload motion. This is the next controller-development step after the real flights, not a flight-tested tune.

## Give the experiment an end

I wanted useful progress without disappearing into another endless tuning sweep. Working with Codex, I limited this study to two controller revisions. The model coefficients stayed fixed. Each revision had to explain an observed behavior, and we would keep worthwhile tradeoffs rather than demand that every score improve.

The test sequence started airborne, settled, then commanded climb, altitude capture, descent, and sustained turns in both directions. After choosing a candidate, I repeated it with a softer roll model and lower battery voltage, then ran the existing extended AUTO mission with its original checks.

## First, stop the steering loop from shaking the payload

A pitch-rate signal does not tell you what caused the motion. Before trying to damp it through throttle, I wanted to know how much was being injected through the brakes.

We removed individual steering terms in successive settled test windows. With the original controller, pitch-rate RMS was about 16.5 degrees per second. Removing the heading-rate proportional term brought it down to about 3.3. Removing the roll damper or acceleration feedforward alone had much less effect. Repeating the original settings brought the motion back.

That pointed toward the heading-rate feedback as the main source of the fast excitation in this configuration. The first revision reduced its proportional gain from 0.04 to 0.005 and the roll-rate damping gain from 0.03 to 0.003.

It also corrected the vertical feedforward. The simulated aircraft needed about 44.6% throttle to hold level flight and 59.9% to climb at 1 m/s. With the throttle ceiling at 60%, a 45% cruise setting and 1 m/s climb calibration made sense. A separate fixed-brake test isolated this change: climb height error fell from roughly 0.73 to 0.08 m RMS.

Those are model trim calculations. They do not replace the climb and sink limits I originally estimated from flight data.

## A quieter controller exposed too much steering feedforward

The first revision worked well in straight flight, but it turned much harder than requested. A roughly 10-degree-per-second command produced about 35 degrees per second. The original feedforward was now plainly too large.

Steady-turn calculations gave different requirements in each direction, consistent with the model's asymmetric brake trim. Expressed as equivalent feedforward gains, the left and right solutions were about 0.0056 and 0.0123. I chose 0.009 and let the existing integrator correct the remaining bias. I also disabled acceleration feedforward for this candidate.

The final sustained-turn errors were 0.31 degrees per second to the right and 0.14 to the left. This was the turning behavior I needed for mission development: a command that produced a predictable, sustained turn.

![Matched original controller and final candidate during climb and sustained turning](../research/flight-log-analysis/figures/turn-model-spike/longitudinal-design/final-comparison.png)

*The same model with the original settings and the selected candidate. Height error and payload motion need to be read together: following the route does not necessarily mean the aircraft is moving smoothly.*

## The altitude-capture kick

There was still a sharp pitch transient when I released the climb command. In FBWB, returning the pitch stick to neutral captures the current altitude. The resulting change in altitude demand generated a brief spike in its derivative, which went straight into throttle feedforward.

I added a first-order smoother to that derivative:

```text
filtered_rate += dt / (dt + time_constant) × (raw_rate − filtered_rate)
```

The selected time constant is 0.5 seconds. Height feedback and the trajectory's slew limits stay the same. The new parameter, `TECS_PG_HR_TC`, defaults to zero, so existing configurations retain their previous behavior.

![Altitude capture with and without feedforward smoothing](../research/flight-log-analysis/figures/turn-model-spike/longitudinal-design/capture-smoothing.png)

*This comparison changes only the feedforward smoothing setting. Peak pitch rate during climb capture drops from 64.1 to 14.7 degrees per second.*

There is a cost: climb height RMS error rises from about 0.10 to 0.14 m, and capture error from 0.06 to 0.08 m. I would take that small tracking penalty for a 77% reduction in the capture transient.

## Why the pitch damper is still off

Both revisions compared damping off with a small reversed-sign gain, and with a reversed-sign gain using additional filtering to reject slow motion. Reversing the sign did not solve the excessive turn command in the first revision. After the steering correction, the damper variants tracked similarly to the undamped candidate, but generally added more settled pitch-rate variation.

The filtered version reduced some transient peaks. That was not enough benefit to include it in the selected configuration. Leaving the damper off is the result of this comparison, not a claim that throttle damping can never help.

## The full mission

The final candidate passed the existing AUTO test, including altitude changes, opposing multi-turn loiters, corner checks, a home loiter, and controller handover. The mission record spans about 20 simulated minutes.

| Result | Selected candidate |
|---|---:|
| Maximum waypoint altitude error | 1.67 m |
| Maximum corner overshoot | 0.66 m |
| Median radius, first / second loiter | 26.74 / 26.68 m |
| Requested loiter radius | 25 m |
| First-loiter bank standard deviation, final 30 seconds | 0.039° |

With the high-DOF model's original gains, that last bank-variation measurement was 2.60 degrees. The new candidate follows a slightly wider circle, with slightly more corner overshoot, but the repeated bank oscillation is essentially gone in the settled window.

![Bank motion and radius during the final 30 seconds of the first AUTO loiter](../research/flight-log-analysis/figures/turn-model-spike/longitudinal-design/auto-loiter.png)

*Purple is the new candidate. Green is the high-DOF model with original gains; red is an earlier conservative-gain experiment. The older simple-model results are included for context. This is a controller comparison, not evidence that the simple model captured the real aircraft's dynamics.*

Across the matched climb test, height RMS error improved from 0.92 to 0.14 m. The important result is that the height tracking, sustained turning, and payload motion improved together without changing the simulated aircraft to make the controller look better.

## What I would work on next

The same gains remained well behaved with the softer roll model. Reducing voltage from 22.2 to 20.4 V also preserved stable behavior, but climb height RMS error grew to 0.48 m and altitude capture produced a larger transient. The throttle did not saturate; the fixed nominal-voltage feedforward was less accurate.

That makes voltage-aware throttle feedforward a useful next experiment. It could improve the starting throttle estimate as the pack discharges and leave the feedback terms less error to clean up.

For now, I have a concrete candidate for powered, up-and-away controller development: calibrated steering and vertical feedforward, reduced lateral feedback, smoother altitude capture, and no pitch-rate throttle damper. Wind, launch, landing, and flight validation remain separate work.

The [plotting scripts](../research/flight-log-analysis/scripts/native-sitl/) and [figure provenance manifest](../research/flight-log-analysis/manifest.json) are archived here. The native implementation and test recipe are recorded at local ArduPilot commit `af6b2ca963` on `paraglider-high-dof-control`; the raw research logs remain in Mission Planner and the original SITL experiment folders.
