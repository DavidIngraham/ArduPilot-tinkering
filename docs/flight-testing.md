# From First Tosses to Autonomous Missions

*Micro-AGU · [Start with the flight story](flight-testing.md) · [Design](micro-agu-design.md) · [Steering](paraglider.md) · [Throttle and pitch](longitudinal-observer.md) · [First controller](first-flight-controller.md) · [After Trout Lake](controller-design.md) · [Data and methods](data-and-methods.md)*

The first problem with Micro-AGU was getting it into the air. At the Barrett Park RC field in Hood River, I was learning to launch a lightly loaded model while discovering what needed fixing. By the next test day at my friend Collin’s house in Trout Lake, it flew autonomous missions for nearly an hour.

Between those flights came hardware fixes, measurements, and experiments in our simple simulator. This is the sequence that made the aircraft work. The [design chapter](micro-agu-design.md) explains how an affordable HobbyKing V2 canopy and modern open-source avionics made the project practical.

| Stage | What I learned or changed |
|---|---|
| January 3, Barrett Park | Launch technique, ballast, brake trim, and the first climb/glide measurements |
| Between flights | Fixed the power-input capacitor problem and tuned lateral gains in the initial simulator |
| February 15, Collin’s house | Added payload ballast, measured trim, adjusted longitudinal control, and disabled the troublesome damper |
| Later in that flight | Tested tighter loiters, flew repeated autonomous circuits, and landed after 54.5 minutes with reserve |

## The launch was a skill I had to learn

I initially tried running with the model before tossing it. That produced some very short, unsuccessful attempts. Those logs need their field context: they were failed tosses, not useful tests of a controller in established flight.

Watching Opale Paramodels videos helped me learn a better technique. Getting the canopy inflated and overhead before releasing the model made much more sense than trying to solve the whole launch by running faster. It took practice to make that sequence repeatable. My January 3 notebook specifically calls for a “multi-step walk” and a better hand position—useful contemporary detail behind my recollection of learning to launch.

Opale’s [first-flight Backpack tutorial](https://www.youtube.com/watch?v=UEoCY5cZiRg) and [Ultra 3.5 launch demonstration](https://www.youtube.com/watch?v=Y3AK1-yno0g) illustrate the technique. Their [tutorial playlist](https://www.youtube.com/playlist?list=PLQ6f0XQ2TFqdJHD9zXCt2_ikhzftwdELU) is a useful starting point for setup and launching.

The [V2 manual](https://manuals.plus/m/cdab9dabe4a9759fe1f47d8eb9e2d012e56b482351e1acf6d5046c899579cf24) also describes a smooth overhead launch with the canopy inflated before release. [Other owners’ launch stories](https://www.rc-network.de/threads/hobbyking-paramotor-v2-luftschraube.12051592/) made the learning curve feel familiar.


## Finding trim with the power off

I used the brake-setup sections of Opale's [first-flight Backpack tutorial](https://www.youtube.com/watch?v=UEoCY5cZiRg&t=397s) to guide the process: the knots and line marks at **6:37–7:53**, the inflation check with the brakes released at **8:15–9:55**, and the full-brake check at **10:00–10:25**. I adapted that approach to my drum-driven payload by testing trim with the power off.

Before asking the controller to fly the model, I needed a mechanical trim that let it inflate and glide well. I did that with the system powered off. I rotated the brake drums by hand to try different line positions, started with the carriage upside down, and swept it through an arc to inflate the canopy. Then I released it upright into an unpowered glide and watched how it behaved.

I repeated that inflation-and-toss sequence, changing the drum positions until I found the best practical balance between inflation and glide. This was an empirical setup exercise: the electronics were off, so the result came from the rigging and the aircraft rather than a controller correcting it.

Once I was happy, I marked each line where it passed through the spreader bar. I then adjusted the knots so that the same line position occurred at the servo's fully released, or “fully slack,” position. That transferred the trim I had found by hand into a repeatable mechanical reference for the powered system. Here, “fully slack” describes the servo's released endpoint; it does not mean the suspension lines were slack in flight.

[Explore the inflation and release sequence](https://davidingraham.github.io/assets/microagu-viewer/trim-launch.html)

*The payload CAD illustrates the inverted start, arcing inflation and upright release. Power stays off, the drums stay fixed and the propeller stays stopped. This is a keyframed explanation of the technique, not a flight replay or an inflation calculation. The current simulator begins with an inflated canopy.* [Open the animation with pause and scrub controls](https://davidingraham.github.io/assets/microagu-viewer/trim-launch.html).


## Hood River: the model was too light

My first flight, at the Barrett Park RC field in Hood River, was much too lightly loaded. Adding weight made it noticeably more stable. That was a practical lesson before it was a control-system lesson: I needed a model that flew reasonably well before asking an autopilot to improve it.

The ballast went on the **bottom of the payload**, increasing wing loading, lowering its CG, and changing its pitch inertia. The model flew noticeably better with the added weight. Opale’s [FAQ](https://www.opale-paramodels.com/gb/content/11-faq-rc-paraglider) discusses the same practical benefit of ballast for wind penetration.

My brake lines also needed loosening. The model flew nose-up and performance was disappointing: my notes recorded about 0.5 m/s climb and 0.96 m/s minimum sink. On top of that, I had omitted an electrolytic capacitor on the Matek stack power input. Bad current readings triggered false throttle power limiting. I fixed the capacitor before Trout Lake. Between loading, brake trim, and power limiting, there was plenty to sort out before tuning the controller.

![January 3 notes on launch technique, brake trim, weight and hardware](assets/micro-agu/january-flight-notes.png)

*Original flight notes, notebook page 185. I also flagged the current reading, Yaapu crashes, and the need for a stronger prop guard.*

A big part of that first flight was simply flying it by hand to feel out the platform. I wanted to see how it responded to brake and throttle inputs, what a turn felt like, and how much confidence I could build before handing more of the flying to the autopilot. Of the selected 12.9-minute flight, **8.1 minutes (63%) were in MANUAL**, with another **3.8 minutes (29%) in FBWA**. Brief CRUISE and LOITER trials came later; there was no AUTO mission in this flight.

![Three-dimensional overview of the first sustained Hood River flight, coloured by flight mode](assets/flight-testing/replay/hood-river-3d-overview.png)

*The first sustained Hood River flight in 3D. Orange is MANUAL, blue is FBWA, purple is CRUISE, and yellow is LOITER. The white point marks the selected flight start. The grid spacing is 50 m, with equal horizontal and vertical spatial scale; height is referenced to the estimator origin, not terrain.*

[Explore the recorded Hood River flight](https://davidingraham.github.io/assets/microagu-viewer/flight-replay.html?recording=flight-replays/hood-river.json)

*Hood River replay: the complete flight starts at accelerated speed. Buttons jump to a manual banking manoeuvre or a MANUAL-to-FBWA transition at real speed; the time slider allows arbitrary inspection. The payload view follows the logged attitude; the lower plots show payload roll/pitch and throttle/left/right brake commands. The manual excerpt includes the roughly 55° bank near boot time 766 s.*

This replay uses the flight log, rather than a simulation of what might have happened. The canopy attitude was not measured, so it is omitted. The carriage uses the current CAD model to illustrate the measured attitude. Capstan motion represents commanded position, and the prop stays still because RPM was not logged. Recurring pitch motion is visible even in the longer stretches of flight.

![Successful Hood River flight: relative height, payload pitch and throttle over roughly thirteen minutes](assets/flight-testing/hood-river.png)

*Hood River, January 3: height above home, payload pitch, and throttle during the sustained flight. The flight was predominantly MANUAL and FBWA.*

## Between the fields: measurements and simulation

I used both live telemetry and later Hood River log analysis to understand climb and glide performance. I also fixed the missing capacitor on the Matek power input before the next flight.

For lateral control, I used our simple initial simulation model to explore gains and damping. Mission Planner preserved the February 14 experiments and the final tuning on the morning of February 15. By 11:37 a.m. I had selected the feed-forward and derivative feed-forward values that I flew that afternoon. The [steering chapter](paraglider.md) shows the recorded tuning plots and explains the controller workaround.

## Trout Lake: more ballast, and autonomous missions

At my friend Collin’s house in Trout Lake, I remember a short attempt or failed launch before adding lead to the bottom of the payload. The corrected all-up weights are 1,385 g without that lead and 1,758 g with it—a 373 g difference. With that weight aboard, the next flight lasted **54.5 minutes continuously on one charge**, including AUTO, LOITER, and GUIDED operation. I landed because I had finished testing.

That did not mean the controller was finished. The early part of the flight involved a lot of tuning and some substantial oscillation. Later sections became much quieter, and the repeated waypoint messages show the aircraft making progress through the mission.

![Trout Lake flight showing height, pitch and throttle, with AUTO intervals shaded](assets/flight-testing/trout-lake.png)

*Trout Lake, February 15: tuning early in the flight, followed by quieter autonomous operation. Green marks AUTO mode.*

[Explore the recorded Trout Lake flight](https://davidingraham.github.io/assets/microagu-viewer/flight-replay.html?recording=flight-replays/trout-lake.json)

*Trout Lake replay: the full 54.5-minute flight starts at accelerated speed. Buttons jump to real-time excerpts around disabling the pitch damper (boot time 655.8 s) or a later AUTO circuit; the time slider allows arbitrary inspection. The same attitude and control-output plots make the early oscillation and later behaviour directly visible.*

Both recaps use each flight's logged servo ranges and reversal settings, including the asymmetric left/right brake ranges. The percentages are normalized output commands, not measured brake travel. Position comes from the onboard estimator, with a local horizontal origin; the displayed height is above the estimator origin. The [replay tool](https://github.com/DavidIngraham/micro-agu/tree/main/viewer#real-flight-log-replay) also supports scrubbing and playback at different speeds. [Hood River metadata](assets/flight-testing/replay/hood-river.json) and [Trout Lake metadata](assets/flight-testing/replay/trout-lake.json) record the exact windows, mode durations, parameter histories, and source hashes. The short launch attempts remain part of the launch story rather than being presented as controller tests.

Early in the flight, I repeated the throttle-versus-climb testing with the heavier configuration. I first raised trim throttle from 30% to 50%, then settled on 43%. Reconstructing the early steady runs gives a level-flight crossing near 42.7%, closely matching that choice.

The pitch damper was another matter. I reduced its gain, then disabled it because the aircraft behaved better without it. I did not understand the sign error at the field. Later analysis showed how the throttle correction could reinforce the payload’s motion—the [longitudinal chapter](longitudinal-observer.md#the-damper-that-could-make-things-worse) follows that discovery.

One of the satisfying results is the later continuous AUTO segment. It lasts more than ten minutes. The recorded path shows repeated circuits, while the height and throttle traces show the controller maintaining the mission rather than simply passing through a mode switch.

![More than ten minutes of AUTO flight: relative ground track, actual and demanded height, and throttle](assets/flight-testing/trout-lake-auto.png)

*Ten minutes of AUTO: repeated circuits, height tracking, and throttle. The track origin is the start of this segment.*

## Testing tighter turns at Trout Lake

The lateral gains came from the simulator and stayed fixed throughout the long flight. I deliberately reduced the loiter-radius setting from 60 to 40 metres at 10:26 after takeoff, then to 30 metres at 35:47. The first change was in LOITER; the second was entered in GUIDED.

![Trout Lake response to reducing the loiter radius from 60 to 40 metres](assets/flight-testing/lateral-loiter-response.png)

*The dashed line marks the 60 → 40 m radius change. Grey shading marks a brief MANUAL interval between LOITER segments. Bank and heading-rate transients are visible alongside the eventual path tracking.*

Selected settled portions of the 60 m and 40 m loiters show median heading rate increasing from about 5.0 to 6.4 degrees per second. A later 40 m segment had 0.36 m RMS logged cross-track error. That gave me a concrete result from the flight: the controller could guide the aircraft around a tighter circle, while the transitions still gave me work to do.

## What endurance did it actually achieve?

The battery choice started with a 6S Li-ion pack I already owned from GetFPV. I bought another and connected the packs in parallel because the aircraft needed weight. The motor was a cheap Amazon purchase with a roughly suitable KV, and prop diameter was constrained by the payload and packability. The [design post](micro-agu-design.md#a-battery-i-already-owned-and-propulsion-that-fit) explains that tradeoff. The result was useful endurance without a systematically optimized propulsion installation.

| Flight / segment | Duration | Charge used | Energy used | Average battery power |
|---|---:|---:|---:|---:|
| Hood River, January 3 | 12.92 min | Invalid | Invalid | Invalid |
| Trout Lake, February 15 | 54.53 min | 3.923 Ah | 84.97 Wh | 93.5 W |
| Late continuous AUTO segment, within that Trout Lake flight | 10.38 min | 0.690 Ah | 13.94 Wh | 80.6 W |

During the full flight, mean current was 4.32 A. The late AUTO segment averaged 3.99 A and 80.6 W, finishing about 10 m higher than it started.

![Trout Lake battery voltage, current and cumulative energy over the selected airborne interval](assets/flight-testing/trout-lake-endurance.png)

*Trout Lake: battery voltage, current, and energy used over 54.5 minutes. Green highlights the late AUTO segment.*

The missing capacitor made Hood River’s energy figures unusable: the monitor reported 11.77 Ah and 270 Wh in 12.9 minutes from a 6 Ah battery. Its false power readings exceeded the configured 2,400 W limit for about 134 seconds. That explains why a current-sensing problem could also hurt flight performance—the watt limiter responds by reducing available throttle.

After fixing the capacitor, the capacity estimates were accurate. Trout Lake used **3.92 Ah out of 6 Ah**, leaving about **2.08 Ah, or 35%**, when I finished flying.

This was a **54.5-minute test flight with reserve**, rather than a flight to exhaustion. At the same average current, 6 Ah corresponds to about **83 minutes** of total flight time. That is an extrapolation; the flight itself demonstrated nearly an hour and ended when I was done testing.

Pack voltage fell from 24.46 V near the start of logging to 20.12 V near the end. The useful result is how much flight time came from a battery I already owned, a second pack added for weight, and inexpensive propulsion sized to fit the payload.

The [data and methods appendix](data-and-methods.md#flight-measurements) contains the measurement windows and calculations.

## What the flights left to solve

The aircraft could fly autonomous missions and tighter circles, with useful endurance. The next questions were more specific: could I control turn rate directly, and could I control climb without exciting the motion between canopy and payload?

The [steering chapter](paraglider.md) follows the first question from the roll-controller workaround to dedicated heading-rate control. The [throttle and pitch chapter](longitudinal-observer.md) follows the second from flight identification and the wrong-sign damper to an articulated model and relative-motion feedback.

[Data and methods](data-and-methods.md) records log provenance, measurement definitions, and the distinction between flight results and simulation experiments.
