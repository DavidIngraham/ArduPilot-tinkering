# External MicroAGU simulator

This directory is the reusable simulator: full 9-DOF two-body physics, Python JSON
adapter, actuator/sensor models, trim solvers, named profiles and runtime data.
Experiment drivers, controller candidates, plotting and historical notes live in
[research/sitl-studies](../research/sitl-studies/README.md); the as-built fitting
script lives with [its dated results](../research/as-built-simulator-2026-10-15/README.md).
The runtime never imports experiment code. It was migrated
from ArduPilot commit `94aa4afc8ba8e963b329d92781c3020a4caa3fc3`;
[the migration manifest](../provenance/simulator-migration.json) records original
file hashes. Dated studies and [historical instructions](../research/sitl-studies/HISTORICAL-README.md)
retain provenance; they are not the current build instructions.

ArduPilot retains flight control, mixer/TECS/flare, native firmware tests,
`SIM_Paraglider` (including limited pitch articulation), and generic JSON/WASM
transport. The external model is optional, like JSBSim for Plane. It is not linked
into the firmware. No observer or LQI controller has been moved into ArduPilot.

Keep reusable mechanics, adapters and their regression tests here. Keep hypotheses,
parameter sweeps, fitting scripts and reports under `research/`. A result needed by
the runtime is explicitly promoted as a configuration artifact: the selected
`as-built-calibration.json`, geometry, trim references and mission-controller
preset remain here so the simulator and browser build need no research checkout.
Named legacy profiles are retained as reusable API compatibility, not executable
study drivers. `smoke_sitl.py` is a transport regression check, not a controller study.

## Build and verify

Ubuntu/WSL requires g++, Eigen3, Python with NumPy/SciPy and pymavlink for native
ArduPilot integration. From this repository:

```sh
bash simulation/build.sh
cd simulation
python verify.py
python -m unittest test_json_backend test_surface -v
```

`mission` retains the original model for reproducing old results. `as_built` uses
132 mm riser spacing, routing and the [bounded existing-log fit](../research/as-built-simulator-2026-10-15/README.md).
`dynamic_roll`, `routed_research` and `wide_research` remain explicitly named
research alternatives. The 185 mm `wide_research` configuration is not deployed.

## Native ArduPilot loop

Build the separate [firmware branch](https://github.com/DavidIngraham/ardupilot/tree/paraglider-browser-9dof)
with `./waf configure --board sitl` and `./waf plane`. Set `ARDUPILOT_ROOT` to that
checkout for scripts that run its autotest framework. Standalone physics and
observer experiments do not need a firmware checkout.

```sh
# First terminal, microAGU repository
python simulation/json_backend.py --profile as_built --ground
# Second terminal, ArduPilot checkout; replace the microAGU absolute path
Tools/autotest/sim_vehicle.py -v ArduPlane -f paraglider --model JSON:127.0.0.1 \
  --add-param-file /path/to/microAGU/simulation/sitl.parm --console
```

Initialize and arm in MANUAL/FBWA, set launch throttle, then press Enter in the
backend terminal. `--ground` enables reduced contact and assisted overhead
inflation/hand release. Without it the legacy 100 m moving-trim initialization is
retained. The native adapter speaks ArduPilot's existing UDP JSON interface.

For native comparison scripts, for example:

```sh
export ARDUPILOT_ROOT=/path/to/ardupilot
python research/sitl-studies/compare_autotest.py --help
```

The browser compiles `dynamics.cpp` and `surface.cpp` directly into a separate
WASM module; [browser build, tests and deployment](../viewer/SIMULATOR.md).
The browser adapter and native adapter preserve the same brake/propulsion model.
Firmware uses simulated IMU/GPS measurements through its own AHRS/EKF; rendered
body poses are simulation truth. Standalone observer/LQI harnesses are separate
research experiments and do not imply ArduPilot was in their control loop.

Ground contact, scalar inflation and prescribed hand motion are development
approximations. Existing logs do not identify inflation pressure, fabric shape,
contact friction or launch timing. See the fit report for all assumptions.
