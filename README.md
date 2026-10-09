# ArduPilot tinkering

I started this work with questions about how ArduPilot could fly my paraglider better. Could a controller designed around turning make more sense than adapting a roll controller? Could a simulation capture the canopy/payload motion I was seeing in flight? And how much longitudinal control authority could I use without exciting that motion or stalling the wing?

The turn-tracking questions also led me into fixed-wing trajectory planning. I wanted to understand whether planning transitions between track segments could improve on L1, particularly when waypoints are close together or wind makes a simple turn radius misleading. I moved that experiment onto a separate Plane branch so I could develop and test it independently before bringing anything back to the paraglider.

This repository tells that story through the questions, experiments and results. I worked with Codex to implement ideas, run comparisons and investigate failures. These are simulation-based engineering investigations; I have not established that the experimental designs are ready for flight.

The write-ups are rendered directly from this repository on [my project site](https://davidingraham.github.io/ardupilot-tinkering/), with figures and results linked to their source files here. The homepage repository manages the publishing manifest; edits to these Markdown files appear when readers reload, subject to GitHub caching. This research archive is now public.

## The questions I explored

- [Micro-AGU design](docs/micro-agu-design.md): the motivation, physical payload design, and lessons from the original notebook.
- [Real flight testing](docs/flight-testing.md): learning to launch, ballast and trim, autonomous missions, and pitch-damper behavior.

- [Plane trajectory planning](docs/trajectory.md): line-to-line turns, wind, raster surveys and Monte Carlo results.
- [Paraglider model and lateral control](docs/paraglider.md): heading-rate steering, pitch articulation and launch experiments.
- [Longitudinal control and observer design](docs/longitudinal-observer.md): truth-state benchmarks, observability and normalized force balance.

## ArduPilot implementations

| Topic | Working branch | Snapshot documented here |
|---|---|---|
| Plane trajectory | [plane-trajectory-wip](https://github.com/DavidIngraham/ardupilot/tree/plane-trajectory-wip) | [81f32455ec](https://github.com/DavidIngraham/ardupilot/commit/81f32455ec7098888d21977fdc474f3b64657ba4) |
| Paraglider | [paraglider-rebase](https://github.com/DavidIngraham/ardupilot/tree/paraglider-rebase) | [b2f6da3a18](https://github.com/DavidIngraham/ardupilot/commit/b2f6da3a183a68d3de6f2c721ec90fca0eab53d5) |

I keep the implementation and native autotests in those ArduPilot branches, and the runners, tuning sweeps, plotting programs, temporary prototypes and results here. That separation lets me preserve the experiments without adding every one-off script to ArduPilot. I also tried a Lua quicktuner, but decided to keep it as separate WIP until it proves its value: see [its patch](provenance/quicktune-stash.patch) and [source](provenance/quicktune-untracked/libraries/AP_Scripting/applets/paraglider-quicktune.lua). It is not included in the durable paraglider commits. The longitudinal truth-state controller and proposed observer are likewise research, not deployed features.

## Archive and restore

This research snapshot contains **2,155 artifacts** (474,539,635 original bytes). Sources, notes, figures, parameters and measured results are preserved. I omitted the raw flight/console logs and built ELF binaries to keep the archive focused on the work and its results; [the omission manifest](provenance/omitted-raw-artifacts.json) records their original names and checksums. I kept the scripts and configuration files to support rerunning the experiments. Generated Python runtime caches were also excluded. Older results are retained even when superseded; consult the write-ups before interpreting a plot.

Large retained data files are losslessly compressed. Everything is stored in ordinary Git; Git LFS is not required. To clone and verify the retained artifacts, run:

```sh
git clone https://github.com/DavidIngraham/ArduPilot-tinkering.git
cd ArduPilot-tinkering
python3 tools/restore_artifacts.py --verify
python3 tools/restore_artifacts.py --destination ../restored-tinkering
```

Restore before running historical scripts that expect uncompressed filenames. Some runners contain original absolute workspace paths and require adjustment. They are archived provenance, not a portable turnkey test suite. Use a separate ArduPilot checkout for runners that temporarily modify production sources.

[Artifact manifest](provenance/artifact-manifest.json) records original names, SHA-256, sizes and permissions. [Verification](provenance/archive-verification.txt) confirms byte-for-byte restoration. [Trajectory plot bundle](artifacts/trajectory-planner-plots.zip) contains the earlier requested plot collection; newer figures are also retained in scratch.

I captured this archive on 2026-10-09. [Branch provenance](provenance/branches-final.json) records exact implementation commits. Historical scratch notes are preserved verbatim and can describe obsolete code or assumptions. ArduPilot-derived source retains its upstream notices and GPL licensing; see [COPYING.txt](COPYING.txt). Third-party materials retain their own notices.
