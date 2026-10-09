# Micro-AGU: returning to small guided parafoils

My interest in guided parafoils started in high school, when I helped with test execution at Stara Technologies. My role was mostly test support: roaming around the desert on ATVs, recovering hardware after test flights, and picking up the pieces.

Stara was developing miniature autonomous parafoil systems. A [2002 company announcement](https://guidedparafoils.org/wp-content/uploads/2019/10/ProQuestDocuments-2019-10-06.pdf) describes a guidance unit weighing just over half a pound, combining GPS, a compass, and motor-driven steering under a small parafoil. Its later [Mosquito system](https://www.spacewar.com/reports/STARA_Technologies_Demos_UAV_Precision_Airdrop_Capabilities_For_US_Military.html) pursued precision delivery of small payloads from unmanned aircraft. I was helping execute tests, not designing those guidance systems, but the idea stayed with me.

I'd wanted to try a project like this for years. The higher-end Opale and Hacker canopies cost more than I wanted to spend on an experiment, and I thought the original HobbyKing canopy was pretty bad. The inexpensive V2 canopy changed that: it made the experiment practical. Modern open-source avionics supplied the other key ingredient.

That became **micro-AGU—Micro Aerial Guidance Unit**: an opportunity to explore how much better a small guided parafoil could perform with modern open-source avionics.

![The assembled micro-AGU payload, with its printed frame, brake actuators and propeller guard](assets/micro-agu/build-assembled.jpg)

*The actual build. The lower enclosure is open in this photograph; it does not document a loaded flight configuration.*

The powered paraglider is the current experimental platform. It gives me a way to fly the guidance hardware, collect data, and work through the interaction between the canopy, payload, and controller. Successful powered missions are a useful milestone toward that goal; they do not yet establish the performance of an unpowered precision-delivery system.

This post brings together the physical design, my original notebook, and what the early flights taught me. The [flight-test story](flight-testing.md) covers the launches, ballast changes, autonomous missions, and pitch-damper trouble in more detail.

## A commercial canopy and a custom payload

The canopy is a **HobbyKing V2**, a 2.4 m single-skin wing. [HobbyKing describes](https://hobbyking.com/en_us/h-king-paramotor-v2-w-led-light-bar-2400mm-pnf.html) a revised wing and stronger, smoother lines, with testing and feedback from JohnVHRC. The manufacturer claims easier launching and more stable flight than V1. Those documented changes help explain why V2 was worth trying; my assessment of V1 is my own, not a controlled comparison.

The affordability mattered more than having a premium wing. [Opale](https://www.opale-paramodels.com/gb/rc-paramotor-paraglider-wing/1739-ultra-35.html) and [Hacker](https://www.hacker-motor-shop.com/Para-RC/Para-RC-gliders.htm?a=catalog&p=7836&shop=hacker_e) offer wings across different sizes and performance classes. The ones I had considered were beyond my budget for this experiment. Current catalog prices are not a record of what I paid or an equivalent-performance comparison.

![The custom payload resting on the folded canopy with suspension lines visible](assets/micro-agu/build-canopy.jpg)

*The commercial canopy and the custom payload together. Line routing and brake neutral are part of the integration work.*

HobbyKing specifies a 1.6–2.0 kg flying weight for its complete stock paramotor, with heavier loading for windier conditions. That is useful context for my ballast experiments, not a validated weight target for this custom vehicle. The custom work is concentrated in the suspended payload: a compact package containing the avionics, brake actuators, battery enclosure, motor, propeller guard, and landing structure.

![Saved SolidWorks preview of the micro-AGU payload assembly](assets/micro-agu/assembly.png)

*The saved preview from `microAGU.SLDASM`. This is the actual CAD assembly, not a reconstruction from the flight logs. It does not show the canopy, suspension lines, or the later field-added ballast.*

The assembly divides the hardware into recognizable subassemblies. A central core contains the avionics and paired servo mechanisms. A separate battery enclosure sits below it. The spreader structure, motor and shroud, and skid complete the package. That arrangement makes the aircraft's mechanical layout part of the control problem: thrust, suspension forces, and the mass of the lower payload act at different places.

![Six saved CAD previews: avionics, spreader, battery enclosure, shroud, skid, and motor](assets/micro-agu/cad-subassemblies.png)

*Individual saved previews are arranged for comparison and are not shown at a common scale.*

The component tree fills in details that are difficult to see in the overall preview:

| Subsystem | What the saved design contains |
|---|---|
| Brake actuation | Two instances of `ServoAssembly`, each containing a `DS339HV`, a servo horn, and a control arm |
| Avionics | `AutoPilot`, `USBBoard`, and `ESC` components within the core assembly; an `M10Q-5883` component in the main assembly |
| Propulsion | A `3115Motor` assembly, separate rotor and stator models, and an `APC 9x6 CW` propeller model |
| Battery packaging | Two instances of `Nav6S300Lion` in `BatteryBoxAssm`, plus two battery gates in the main assembly |
| Structure | Spreader assembly, core block, top block, battery enclosure, propeller shroud, and skid |

Those are identities in the saved CAD, rather than a verified bill of materials for every flight. In particular, two battery-model instances do not establish how the packs were wired, their actual capacity, or which packs were carried on a particular day. The `AutoPilot` model name alone does not identify the board; the flight logs provide the evidence for the Matek H743 controller used in the tests.

![The compact core held in one hand, with motor and side-mounted brake mechanisms](assets/micro-agu/build-core.jpg)

*The core before the surrounding frame and propeller guard are fitted; a useful sense of scale.*

![Open core showing the flight electronics, microSD card, wiring and power connections](assets/micro-agu/build-electronics.jpg)

*The assembled electronics. The photos document packaging; they do not establish the wiring or component configuration of every flight. The print material has not been identified from the photographs.*

## Two brake channels, and an airplane autopilot to adapt

The December 30, 2025 implementation checklist starts with the mixer: roll command to asymmetric brake output, pitch command to symmetric brake output. It also calls for a TECS patch with a gyro damper, simulation parameters, manual simulation checks, flight parameters, and trim checks.

![Original December 30 implementation and flight-test checklist](assets/micro-agu/implementation-notes.png)

*My notebook, page 1. These are planned tasks, not a record that every item was completed.*

That checklist captures the adaptation I was trying to make. ArduPilot supplied an existing navigation and flight-control framework, but the parafoil's controls needed different interpretation. The brake mixer was one piece. The relation between throttle and payload pitch was another, and eventually the source of a much less intuitive problem.

The [V2 manual](https://manuals.plus/m/cdab9dabe4a9759fe1f47d8eb9e2d012e56b482351e1acf6d5046c899579cf24) makes the intended brake behavior concrete: turning pulls one brake, while the transmitter's up-elevator command pulls both. Its 81.5 cm brake-line measurement is tied to the stock control arms and cannot simply be copied onto my actuator geometry. [JohnVHRC's setup video](https://www.youtube.com/watch?v=OqNvJ_UtPqc&t=480s) explains the mixing, followed by line measurement around 12–15 minutes. The transcript is useful alongside the manual; it is not a substitute for checking actual neutral and travel.

The same page lays out a progression through inflation and glide tests, range and failsafe checks, manual flight, FBWA/FBWB, and then LOITER and AUTO. Launch, pattern work, climb/glide, and turns were all on the list. The notebook's January 30 control-law sketches return to the lateral loop, comparing the standard ArduPlane structure with the paraglider approach. These notes connect the physical build to the later [turn-control and simulation work](paraglider.md).

Much of the 323-page notebook is collected research rather than my own design record. It includes work on small paramotor guidance, powered-paraglider longitudinal dynamics, and autonomous paramotor development. Those papers were background for the investigation; their photographs, dimensions, and performance results describe other aircraft.

## What the first flight sent back to the design

The January 3 flight notes are more specific than my memory of a difficult launch day. They call for a multi-step walk to launch, a better hand position, a stronger prop guard, and more weight for wind penetration. They also say the brake lines needed loosening: the model was flying with a persistent nose-up attitude and was not giving the performance I expected.

![Original January 3 flight notes recording launch, brake trim, weight, and hardware concerns](assets/micro-agu/january-flight-notes.png)

*My notebook, page 185. The climb and sink figures are contemporary notes from my log review, not a new performance characterization.*

I recorded about 0.5 m/s climb and a minimum sink figure of 0.962 m/s, with brake trim explicitly suspected of influencing both. The page also flags an apparently incorrect current reading and Yaapu crashes. That makes these notes useful design feedback, but a poor basis for claiming a clean endurance or aerodynamic benchmark.

The hardware implications were direct. The shroud and skid had to work during awkward handling and landings. The brake mechanism needed usable travel and correct neutral trim. The instrumentation needed to be trustworthy before its numbers could support a performance claim. Autonomous flight did not remove those requirements.

## Ballast belongs in the mechanical model

The early Hood River configuration was too light. Adding ballast improved its behavior. At Trout Lake we added another kilogram of lead and went on to fly successful AUTO missions.

The ballast was attached to the **bottom of the suspended payload**, not to the canopy. That distinction matters. It increased the weight carried by the same wing and shifted the payload CG downward; it also changed the payload's pitch inertia. Adding it cannot be represented faithfully by increasing canopy mass in the simulation.

The bottom-mounted ballast makes the thrust-line question especially relevant. In the articulated model, thrust above the payload CG produces a direct nose-down moment, even though the motor sits below the suspension. A pitch-rate damper designed around the opposite initial response can reinforce the motion. The [flight-test post](flight-testing.md) shows the force diagram and the log segment where disabling the damper sharply reduced the oscillation.

The CAD previews establish the packaging, and my field recollection establishes where the ballast went. They do not yet supply a measured loaded CG or inertia tensor. The next useful measurements are the mass and CG of each flown configuration, the thrust-line offset, suspension geometry, brake travel and neutral setting, and the canopy's actual rigging. Those are the inputs needed to turn a plausible model into one that predicts this aircraft.

## What better performance will mean

The motivation remains the same as when I started: see what modern open-source avionics can do for a small guided parafoil. The early results establish that this powered platform can fly sustained autonomous missions. They also show why a working mission is only the beginning of the evaluation.

A useful comparison needs a recorded configuration and repeatable conditions. Guidance accuracy, wind handling, trim, and the canopy–payload motion all belong in that evaluation. For now, the design, flight data, and [longitudinal-controller investigation](longitudinal-observer.md) give me a way to identify what to measure and what to improve next.

## Sources and limits

This account uses my recollections, the original notes on pages 1, 185, and 323 of `Paraglider.pdf`, and the saved SolidWorks assembly and part files in the micro-AGU project. The [design evidence file](assets/micro-agu/design-evidence.json) records source hashes and the recovered assembly structure. Saved previews and component metadata were extracted locally using [SWFormat](https://github.com/KenM76/swformat); the native assembly was not rebuilt and its mass properties were not validated. The notebook's collected third-party papers are not reproduced here.
