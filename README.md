# Micro-AGU

Micro-AGU is my micro aerial guidance unit: an affordable powered parafoil built to explore autonomous flight with modern open-source avionics. This repository brings together the mechanical design, project articles, simulation viewer, analysis scripts, plots and experimental results.

## Project map

| Directory | Contents |
|---|---|
| [cad/](cad/) | Editable SolidWorks parts and assemblies, copy manifest and CAD workflow |
| [docs/](docs/) | Build, flight tests, controller design and landing articles |
| [viewer/](viewer/) | Three.js live/replay viewer, articulated CAD assets and export tools |
| [research/](research/) | Reproducible studies, final plots, configurations and bounded replays |
| [tools/](tools/) | Archive and analysis utilities |
| [provenance/](provenance/) | Historical source and result manifests |
| [scratch/](scratch/) | Retained historical experiments |

## Read the project story

1. [Building Micro-AGU](docs/micro-agu-design.md)
2. [From First Tosses to Autonomous Missions](docs/flight-testing.md)
3. [Controllers through Trout Lake](docs/first-flight-controller.md)
4. [Simulation and controller refinement](docs/controller-design.md)
5. [Spot landing](docs/spot-landing.md)
6. [Toward a precision swoop landing](docs/swoop-landing.md)

The [project site](https://davidingraham.github.io/research/?collection=ardupilot-tinkering) renders these articles directly from this repository. The existing collection identifier remains stable so saved blog links continue to work. [Data and methods](docs/data-and-methods.md) explains the evidence and model limitations; [the next flight test card](docs/next-flight-test-card.md) covers flight validation.

## Firmware and simulation

The active flight controller, native autotests and 9-DOF simulator remain in the [paraglider-high-dof-control ArduPilot feature branch](https://github.com/DavidIngraham/ardupilot/tree/paraglider-high-dof-control). Keeping that code in the ArduPilot fork preserves its upstream build and development workflow. This project repository contains the associated hardware, viewers, experiments and documentation. Earlier implementation snapshots are recorded under provenance; [Plane trajectory planning](docs/trajectory.md) is a related investigation.

The Windows CAD originals remain in place while [cad/](cad/) provides the versioned project copy. Raw flight logs and full simulation traces remain in Mission Planner; final plots, scripts and compact replay excerpts belong here. The original controller flew real missions; subsequent controller and landing studies remain simulation work.

## Archive and restore

This research snapshot contains **2,155 artifacts** (474,539,635 original bytes). Sources, notes, figures, parameters and measured results are preserved. I omitted the raw flight/console logs and built ELF binaries to keep the archive focused on the work and its results; [the omission manifest](provenance/omitted-raw-artifacts.json) records their original names and checksums. I kept the scripts and configuration files to support rerunning the experiments. Generated Python runtime caches were also excluded. Older results are retained even when superseded; consult the write-ups before interpreting a plot.

Large retained data files are losslessly compressed. Everything is stored in ordinary Git; Git LFS is not required. To clone and verify the retained artifacts, run:

```sh
git clone https://github.com/DavidIngraham/micro-agu.git
cd micro-agu
python3 tools/restore_artifacts.py --verify
python3 tools/restore_artifacts.py --destination ../restored-tinkering
```

Restore before running historical scripts that expect uncompressed filenames. Some runners contain original absolute workspace paths and require adjustment. They are archived provenance, not a portable turnkey test suite. Use a separate ArduPilot checkout for runners that temporarily modify production sources.

[Artifact manifest](provenance/artifact-manifest.json) records original names, SHA-256, sizes and permissions. [Verification](provenance/archive-verification.txt) confirms byte-for-byte restoration. [Trajectory plot bundle](artifacts/trajectory-planner-plots.zip) contains the earlier requested plot collection; newer figures are also retained in scratch.

I captured this archive on 2026-10-09. [Branch provenance](provenance/branches-final.json) records exact implementation commits. Historical scratch notes are preserved verbatim and can describe obsolete code or assumptions. ArduPilot-derived source retains its upstream notices and GPL licensing; see [COPYING.txt](COPYING.txt). Third-party materials retain their own notices.

## Flight-data research figures

[Research figure index](research/flight-log-analysis/index.html) collects the final
plots linked from the flight-data and simulator research reports. The
[manifest](research/flight-log-analysis/manifest.json) records each figure and
plotting script's original path and SHA-256. The plotting source and its local
Python dependencies are mirrored under `research/flight-log-analysis/scripts/`.

The research reports, flight logs, telemetry exports, parameters and simulation
trace datasets remain in Mission Planner and the original native experiment
directories. They are not added to this figure archive. Historical scripts can
retain absolute source-data paths or require adjacent model/configuration files;
use the manifest to locate those originals. The native SITL plotters run with the
model package in the `paraglider-high-dof-control` ArduPilot checkout.

Refresh the report-linked figures and plotting source with
`python3 tools/archive_flight_figures.py --source <Mission-Planner-analysis>/longitudinal-2026-10-09 --native-source <ArduPilot>/Tools/simulation/paraglider`.
Local report assets remain available so the existing research log keeps rendering.

## Interactive simulator viewer

[Micro-AGU flight viewer](viewer/README.md) provides a local Three.js replay and live
SITL view of the canopy, payload, joint motion, and actuator states.

## Spot-landing study

[Landing Micro-AGU: From TECS Approach to Brake Flare](docs/spot-landing.md)
covers the native landing supervisor, TECS comparison, common-brake allocation,
and final Monte Carlo results. It includes an orbitable 3D replay with an
earth-fixed bullseye, moving ground reference and actuator histories.
