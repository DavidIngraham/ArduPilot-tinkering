# Migrated SITL and controller studies

These are experiment drivers and historical records, separate from the reusable
[simulator](../../simulation/README.md). They originated in the ArduPilot external
model directory; [the migration manifest](../../provenance/simulator-migration.json)
preserves original hashes. Files moved with Git retain their history.

| Files | Purpose |
| --- | --- |
| `compare_autotest.py`, `damper_autotest.py`, `longitudinal_autotest.py` | Native firmware comparison and ablation experiments |
| `landing_*` | Landing cases, Monte Carlo experiments and reports |
| `controllers.py`, `mission_demo.py` | Standalone diagnostic controllers and mission comparisons |
| `*_closed_joint_tour.py` | Native AUTO joint-release experiment and viewer-result packaging |
| `study-*`, `study_*.py`, `longitudinal_frequency.py` | Study configurations, trim checks and frequency analysis |
| `analyze_*`, `plot_*`, `report_*`, `compare_longitudinal_study.py` | Analysis and report generation |
| Historical Markdown, text and provenance JSON | Original methods, assumptions and results |

The small `_sim_path.py` bootstrap resolves `../../simulation` relative to these
files, so scripts run from any working directory. The dependency goes from studies
to simulator. No simulator import or browser build needs this folder.
Set `MICROAGU_SIM_ROOT` to select an alternative simulator checkout; the viewer's
`--model-dir` recording tools forward that choice explicitly.
Selected
runtime presets and trim-reference states are read from `simulation/`; study-only
presets and historical outputs stay here.

From the microAGU repository:

```sh
python -m pip install -r research/sitl-studies/requirements.txt
bash simulation/build.sh
export ARDUPILOT_ROOT=/path/to/ardupilot
python research/sitl-studies/compare_autotest.py --help
python research/sitl-studies/mission_demo.py --help
python research/sitl-studies/landing_monte_carlo.py --help
```

The ArduPilot checkout needs its normal autotest dependencies and a built SITL
binary for native runs. Save raw outputs in a separate run directory. Historical
notes preserve their original paths and commands; use the paths above for the
current layout. Do not interpret old snapshot notes as current build instructions.
