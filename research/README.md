# Research and experiments

This tree contains study drivers, hypotheses, parameter sweeps, fitting, analysis
and results. The reusable runtime is [simulation/](../simulation/README.md); the
interactive application and its build/recording tools are [viewer/](../viewer/README.md).

- [SITL/controller studies](sitl-studies/README.md): migrated native comparisons,
  standalone controller experiments, landing studies and historical notes.
- [As-built calibration](as-built-simulator-2026-10-15/README.md): fitting script,
  input hashes and check-window results for the existing 132 mm hardware.
- Other dated folders preserve their study-specific source, configurations and
  results. Frozen source snapshots remain evidence for those published results.

New experiments belong in a named or dated study folder. Import reusable physics
from the installed `microagu_sim` Python package (`cd research && uv sync --locked`); do not make the simulator import a study. Promote selected
runtime configuration artifacts explicitly, with their evidence and provenance,
rather than running experiments as part of a browser or simulator build.
