# L1 regression archive

Read [report.md](report.md) for the selection, metrics and plots.

Raw logs and full truth recordings stay in Mission Planner. The scripts default
to the original WSL data directory. Set PG_RESEARCH_ROOT to another raw-data
directory if needed; do not write full telemetry into this Git archive.
Use the ArduPilot Python environment (pymavlink, NumPy, SciPy, Matplotlib).

The existing 8-second mission and landing baselines are referenced from adjacent
Mission Planner studies. The JSON plan records the fresh cases. The run scripts
use the existing native harness in /home/david/repos/ardupilot-high-dof.
The archived scripts differ from their executed raw-directory copies only in
their default output-root selection, so rerunning them keeps raw data outside Git.

The JSON results cache completed audits. Remove the derived mission-results.json
or landing-results.json in the raw directory before recomputing every audit
after changing an analysis formula. Preserve the raw recordings.

No raw BIN, telemetry CSV, NPZ or full viewer recording is included here.
