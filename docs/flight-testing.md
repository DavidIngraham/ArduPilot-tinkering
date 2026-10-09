# Learning to launch, then learning to fly

The first problem with my powered model paraglider was getting it into the air. The next was keeping the controller from making it wobble.

This aircraft is part of **micro-AGU (Micro Aerial Guidance Unit)**, inspired by helping execute guided-parafoil tests at Stara Technologies in high school—mostly recovering hardware around the desert on ATVs. I wanted to explore how much better small guided parafoils could perform with modern open-source avionics. This powered test platform uses a **HobbyKing V2 canopy** and a custom suspended payload; the [design post](micro-agu-design.md) describes the hardware and original notebook. I had wanted to try this for years, but the premium canopies I considered were too expensive for the experiment and I thought the original HobbyKing wing was poor. The inexpensive V2 made the project practical.

These flight tests took me from awkward launch attempts in Hood River to sustained autonomous missions in Trout Lake. Looking back through the logs with Codex helped connect what I remembered at the field with what the aircraft actually recorded. The useful story includes the launch technique, the weight of the model, and a throttle-to-pitch response that ran against my intuition.

## The launch was a skill I had to learn

I initially tried running with the model before tossing it. That produced some very short, unsuccessful attempts. Those logs need their field context: they were failed tosses, not useful tests of a controller in established flight.

Watching Opale Paramodels videos helped me learn a better technique. Getting the canopy inflated and overhead before releasing the model made much more sense than trying to solve the whole launch by running faster. It took practice to make that sequence repeatable. My January 3 notebook specifically calls for a “multi-step walk” and a better hand position—useful contemporary detail behind my recollection of learning to launch.

For a visual reference, Opale's [first-flight Backpack tutorial](https://www.youtube.com/watch?v=UEoCY5cZiRg) and [Ultra 3.5: Easy take off with Mike XL](https://www.youtube.com/watch?v=Y3AK1-yno0g) show the sort of preparation and launch technique I was learning. Both are from Opale's own channel; these are useful reference videos, rather than a claim that I have recovered the exact videos I watched that day. Their [tutorial playlist](https://www.youtube.com/playlist?list=PLQ6f0XQ2TFqdJHD9zXCt2_ikhzftwdELU) collects more of the setup material.

The V2 documentation and owner reports put that learning curve in context. The [manual](https://manuals.plus/m/cdab9dabe4a9759fe1f47d8eb9e2d012e56b482351e1acf6d5046c899579cf24) describes a smooth overhead launch and establishing an inflated wing before release. [Owners also report failed launches and broken props](https://www.rc-network.de/threads/hobbyking-paramotor-v2-luftschraube.12051592/). Those accounts resemble my experience, but they do not diagnose my individual attempts.

![Micro-AGU payload and folded HobbyKing V2 canopy](assets/micro-agu/build-canopy.jpg)

*The actual payload and canopy. This is a build photograph, not a photograph of either flight-test session.*

## Hood River: the model was too light

My first flight in Hood River was much too lightly loaded. Adding weight made it noticeably more stable. That was a practical lesson before it was a control-system lesson: I needed a model that flew reasonably well before asking an autopilot to improve it.

Opale's [own FAQ](https://www.opale-paramodels.com/gb/content/11-faq-rc-paraglider) also discusses adding ballast when a model is too light to make progress into the wind. My observation here is narrower: the added weight improved the behavior of my particular model in those conditions. The ballast went on the **bottom of the suspended payload**. That increased wing loading, lowered the payload CG, and changed its pitch inertia. The logs do not record those physical changes, so they cannot separate their contributions to the improvement. This was not an increase in canopy mass.

The notebook adds another contributor: I thought the brake lines were too tight. I recorded a persistent nose-up attitude and disappointing performance, with about 0.5 m/s climb and a minimum sink figure of 0.962 m/s, both suspected to be affected by brake trim. Those are contemporary observations, not a newly validated performance benchmark. Weight alone does not explain everything that needed attention. The stock V2 setup also calls for careful brake neutral and one-sided steering travel; [JohnVHRC demonstrates the mixing](https://www.youtube.com/watch?v=OqNvJ_UtPqc&t=480s). Its stock line dimensions are not directly transferable to my custom actuators. A [later WestHobbiesRC setup walkthrough](https://www.youtube.com/watch?v=HRO3tUq2NUA&t=575s) reinforces the same point; it was published after these flights and is supporting research, not a video I used at the time.

![January 3 notes on launch technique, brake trim, weight and hardware](assets/micro-agu/january-flight-notes.png)

*Original flight notes, notebook page 185. I also flagged the current reading, Yaapu crashes, and the need for a stronger prop guard.*

The sustained January 3 flight gives us a useful early baseline. It spent most of its time in MANUAL and FBWA, followed by brief CRUISE and LOITER trials. There is recurring pitch motion even in the longer stretches of flight.

![Successful Hood River flight: relative height, payload pitch and throttle over roughly thirteen minutes](assets/flight-testing/hood-river.png)

*January 3, 2026. This is an airborne portion of the onboard log, not a launch montage. The height is relative to the estimator's home reference, not clearance above the terrain. The plot does not establish the timing of the ballast change.*

## Trout Lake: another kilogram, and autonomous missions

At Trout Lake we added another kilogram of lead to the bottom of the payload. With the heavier configuration, we were able to fly successful autonomous missions. The February 15 log contains about 54.6 minutes of selected airborne data, including extended AUTO, LOITER and GUIDED operation.

That did not mean the controller was finished. The early part of the flight involved a lot of tuning and some substantial oscillation. Later sections became much quieter, and the repeated waypoint messages show the aircraft making progress through the mission.

![Trout Lake flight showing height, pitch and throttle, with AUTO intervals shaded](assets/flight-testing/trout-lake.png)

*February 15, 2026. Green shading marks AUTO mode. The changes in behavior within this flight include controller tuning and different maneuvers; they are not a controlled comparison of different weights.*

One of the satisfying results is the later continuous AUTO segment. It lasts more than ten minutes. The recorded path shows repeated circuits, while the height and throttle traces show the controller maintaining the mission rather than simply passing through a mode switch.

![More than ten minutes of AUTO flight: relative ground track, actual and demanded height, and throttle](assets/flight-testing/trout-lake-auto.png)

*The ground track is measured relative to the start of this segment. It is not a commanded-path error plot. This is real onboard data, not a simulated mission.*

## Configuration context for the plots

| Figure / interval | What the logs establish | Physical configuration from my recollection |
|---|---|---|
| January 3 overview | Mostly MANUAL and FBWA, with short CRUISE and LOITER trials; no single damper setting is asserted for the whole plot | Hood River was initially too light; ballast helped, but the change is not timestamped in the log |
| February 15 overview | AUTO intervals are shaded; parameters changed during this flight, so it is not one fixed controller configuration | Trout Lake: another 1 kg of lead at the bottom of the payload; total loaded mass was not recorded |
| February 15 AUTO detail | 2738.09–3360.73 s after boot, 10.38 minutes continuously in AUTO | Same day's configuration; no independent measurement of CG or inertia |
| February 15 damper comparison | CRUISE; throttle P and I both zero; damper 0.10 before 655.79 s and zero afterward | No ballast change is documented across these short comparison windows |

The February 15 log reports firmware `3a2da6cf`; the parameter names indicate that this does not uniquely identify the compiled source, as discussed below. The AUTO figure is evidence of sustained mission operation, not a controlled damper comparison. The [evidence file](assets/flight-testing/flight-evidence.json) preserves the exact comparison windows and source hashes.

## The damper that could make things worse

I had added a pitch-rate damper to throttle. My initial intuition was that more throttle would pitch the model up, so adding throttle during a nose-down rotation should oppose that motion.

The inspected controller implementations use the equivalent of:

```cpp
throttle_correction = -pitch_damping_gain * filtered_payload_pitch_rate;
```

With positive pitch rate defined as nose-up, a nose-down rotation produces a positive throttle correction. That only gives the intended damping if the relevant throttle-to-pitch response has the sign I expected.

The articulated model showed why that assumption could fail. The thrust line is below the suspension point, but above the payload CG. Forward thrust therefore produces a nose-down moment about the payload CG. The suspension point moves with the system; treating it as a fixed pivot leaves out an important part of the dynamics.

![Free-body diagram of the payload and canopy, showing thrust above the payload CG and the reinforcing feedback sequence](assets/flight-testing/pitch-damper-fbd-pusher.png)

*The rear-mounted pusher prop is shown pushing forward into the payload; this arrow is thrust on the aircraft, not the rearward airflow. Its line of action remains above the modeled payload CG, so the direct moment is still nose-down. The diagram shows schematic geometry, not measured dimensions. The ballast location is confirmed from the build history; the loaded CG and thrust offset have not yet been measured. The suspension forces are equal and opposite. The labeled thrust offset is the moment arm about the loaded payload CG; the suspension reaction also has a moment arm about that CG. Canopy aerodynamic moment and any joint couple also belong in the complete angular equations.*

For the modeled initial response, the feedback can run in the wrong direction:

**Payload pitches down → controller adds throttle → payload pitches down harder.**

It is tempting to summarize that as inertia beating canopy drag. The more precise explanation is that thrust, the suspension reaction, and the inertias of the two bodies together determine the response. Bottom-mounted ballast shifts the payload CG downward and changes its inertia, making the loaded geometry important. This does not by itself prove that inertia “beat” canopy drag. The direct thrust moment is nose-down in the modeled geometry; canopy forces and the moving suspension affect what happens next. The initial payload motion and the eventual climb response do not have to point the same way.

The flight data contains a particularly useful comparison. In CRUISE, I had already set the throttle P and I gains to zero. At 655.79 seconds after boot, I set the pitch damper to zero too. In the tightly bounded windows below, that was the only control setting changed.

![Pitch rate and throttle immediately before and after the pitch damper was disabled](assets/flight-testing/damper-off.png)

| February 15 comparison | Boot-time window | Payload pitch-rate RMS |
|---|---:|---:|
| Damper gain 0.10; throttle P = I = 0 | 635–654 s | 76.4 degrees/s |
| Damper gain 0; throttle P = I = 0 | 659–681 s | 22.7 degrees/s |

The fast oscillation reduced sharply. Later in the same flight, reintroducing the damper at 0.05 coincided with a stronger component around 1.5 Hz; reducing it to 0.02 brought the rate RMS back down. Those observations support the self-excitation concern.

They do not prove that reversing one gain would fix the whole system. The response depends on frequency, motor dynamics, and the canopy–payload coupling. The earlier simulation work also found relative-rate feedback more useful than payload-only feedback. That is what led me toward the [longitudinal controller and observer investigation](longitudinal-observer.md).

## What the code and logs can actually establish

There are a few details worth preserving rather than smoothing out of the story.

The February 15 firmware reports Git hash `3a2da6cf`, but its logged parameter naming matches later source changes. That means the exact compiled source is not established by the version string alone. The inspected implementations agree on the damper's negative pitch-rate feedback, but I cannot attribute every observed behavior to the clean tree at the reported hash.

The filter code also matters. In the inspected versions, a zero pitch-rate cutoff zeros the damper signal rather than passing through unfiltered gyro data. Positive cutoff changes are copied into the filter on reset, and the 50 Hz filter update uses the throttle loop's timestep. These are additional reasons to distinguish a logged setting from the filter response that was actually running.

Finally, one February 22 telemetry file begins on the real Matek controller and later switches to SITL. Its long, very smooth flight at about 60 m is simulation. I excluded that portion from the real-flight story. The figures here come from the successful January 3 and February 15 onboard logs.

## Bringing the simulation back to the aircraft

The real flights give the simulation specific behavior to reproduce. Quieter stretches repeatedly contain a slow pitch component around 0.32–0.37 Hz. The stronger damper-driven motion lives at a faster timescale. The archived articulated model has a qualitatively similar slow mode, but replaying recorded throttle through its linearization did not reproduce the measured pitch rate particularly well.

That is a useful result: the simulation needs calibration, and the ballast changes mean the flights should not all be treated as one unchanged aircraft. We also have no measured canopy angle or configured pitot in these logs, so they cannot validate an absolute canopy-angle estimate or a stall margin.

The progression was learning to launch, finding a weight that flew well, getting autonomous missions working, and then discovering that a plausible damping rule could reinforce the motion it was meant to suppress. The next controller should earn its bandwidth by reproducing those observations first.

## Data behind the figures

I reviewed six onboard BIN logs, 54 timestamped telemetry logs and their 54 raw companions. Companions are not additional flights. Launch technique, the HobbyKing V2 canopy, and ballast placement are identified from my recollections; the January 3 notebook adds contemporary observations about launch, brake trim, and hardware. Modes, tuning changes and numerical comparisons come from the logs.

The [curated evidence file](assets/flight-testing/flight-evidence.json) records source-log SHA-256 hashes, comparison windows and metrics. The [Hood River](assets/flight-testing/hood-river-plot-data.csv.gz) and [Trout Lake](assets/flight-testing/trout-lake-plot-data.csv.gz) overview series are available as compressed CSVs. The exported overview series are sampled at 5 Hz; the pitch-rate comparisons use the 25 Hz aligned analysis. Raw flight logs remain outside the public repository.
