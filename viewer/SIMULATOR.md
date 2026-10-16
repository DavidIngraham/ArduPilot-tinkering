# Browser flight simulator

The [live flight simulator](https://davidingraham.github.io/assets/microagu-viewer/simulator.html)
runs MicroAGU's ArduPlane firmware locally in WebAssembly. No vehicle connection,
WebSocket server, or account is needed. Use a current browser with WebGL2,
SharedArrayBuffer and service worker support over HTTPS or localhost. The first
visit reloads once to enable cross-origin isolation on GitHub Pages.

## Flying

The example circuit uploads and starts automatically in **AUTO** after sensor
initialization. The aircraft starts held on the ground, inflates through an assisted
hand launch, climbs in FBWA and hands over to AUTO above 12 m. Select a mode
and **Engage** to take control during flight. Reset starts a fresh default mission.
The top mode display is confirmed telemetry.

* **MANUAL**: direct brake and throttle inputs.
* **FBWA**: native heading-rate steering; pilot controls throttle.
* **CRUISE**: centered stick holds heading/altitude; pitch requests climb/descent.
* **LOITER**: orbit the current position.

Drag the right joystick to steer and command pitch. Releasing it centers both axes.
The throttle slider stays at the selected value. Keyboard: arrow keys for the stick,
W/S for throttle. A lost pointer, window blur or hidden tab centers the stick. Browser
background throttling may pause or interrupt simulation; keep the tab visible while
flying. **Reset simulation** creates a fresh aircraft and clears its mission.

## Missions

Load QGroundControl `.plan` (SimpleItem) or QGC WPL 110 `.waypoints` files, or use the
example circuit. Upload waits for ArduPlane's mission acknowledgement. After launch,
**Fly mission** selects item 1 and AUTO. Engage another mode to take over manually.
The route preview and item counter show the loaded route and current sequence.

Supported commands: waypoint, loiter unlimited/turns/time, RTL, land and takeoff.
Supported altitude frames: global MSL and relative to the simulator home. Terrain
altitudes, complex surveys, non-navigation commands and ambiguous coordinates are
rejected instead of silently changed. WPL item 0 is treated as planned home and
replaced by the simulator home. Home is fixed at 45.997° N, 121.536° W, 600 m MSL;
imported coordinates are **not relocated**. Inspect the route before uploading.
The example ends in unlimited loiter rather than an uncommanded landing.

## Wind and camera

Use **Wind** in the flight desk to choose speed (0–10 m/s), the bearing wind comes
from (0° north, 90° east), and vertical air (−3 to +3 m/s, positive upward), then
select **Apply wind**. These are uniform steady winds applied to the actual Rust
dynamics and sensor output. Set speed and vertical air to zero for calm conditions.
Wind is reset to calm on page reload; there is no gust/turbulence model in this UI.

Chase rendering uses a continuous buffered truth clock for the aircraft and camera,
so worker message timing cannot rewind the pose. The chase camera moves with the
sampled payload and smooths its offset; OrbitControls only controls the orbit view.

## Model and visual limits

This version uses the **full 9-DOF canopy–payload research backend**. Its Rust
`sim-core` is compiled into `sim_wasm_bg.wasm`; ArduPlane runs in a
separate WASM module using the fork's `JSON:wasm` lockstep transport. A dedicated
worker exchanges servo frames and IMU/GPS sensor truth without UDP or a server.
The adapter preserves the native brake rate limits, motor dynamics, IMU lever arm
and RK4 substeps. Flight control remains in ArduPlane.

The existing Three.js canopy, SolidWorks payload and suspension tools consume
`microagu.state.v1` truth: independent payload and canopy positions/quaternions,
rotor RPM, brake travel and joint rotation/rates. Fabric deformation is illustrative.
The model uses as-built 132 mm riser spacing and the bounded existing-log fit in
[the calibration report](../research/as-built-simulator-2026-10-15/README.md).
Reduced flat-plane contact retains the two-body constraint. Scalar overhead
inflation and prescribed hand motion approximate launch; neither cloth pull-up nor
canopy collapse is modeled. Launch/contact constants are assumptions, not log fits.
Terrain is an illustrative flat field, not a map or elevation database.
The simulator is a development aid, not a validated flight-training model.

## Build and verify

The exact source revision and SHA-256 hashes are in `public/wasm/build.json`.
Firmware source is public in the ArduPilot fork; the external physics source is
in this repository's `simulation/` directory. Project binaries and source
are GPL-3.0-or-later; Rust dependencies retain their own licenses. `public/wasm/COPYING.txt` accompanies the deployed build.

```sh
# Node >=22; Rust + wasm32-unknown-unknown; wasm-bindgen-cli 0.2.114
# Emscripten 6.0.8 is needed only when rebuilding ArduPilot.
# Checkout DavidIngraham/ardupilot branch paraglider-browser-9dof.
# From microAGU: bash simulation/build.sh; then cd viewer.
# Use simulation/.venv/bin/python (uv sync --locked) for configuration export.
# Saved C++ parity fixtures are preserved independently.
PYTHON=/path/to/python bash tools/build_highdof_wasm.sh /path/to/ardupilot-browser-9dof
bash tools/build_sitl_wasm.sh /path/to/ardupilot-browser-9dof
cp ../COPYING.txt public/wasm/COPYING.txt
npm ci
npm test
node --import tsx tools/test_highdof_wasm.ts
node --import tsx tools/test_sitl_wasm.ts
npm run build
python3 -m http.server 5173 --directory dist
# Open http://localhost:5173/simulator.html
```

The parity test compares 1,200 physics steps and 49 native Python/C++ checkpoints,
including both bodies, sensors, rotor, actuators and joints. The integration test
boots the packaged WASM, confirms MANUAL/FBWA/CRUISE, uploads a mission, arms with
normal prearm checks, launches from ground, climbs into AUTO, checks steering and validates
articulated truth. `tools/generate_mavlink.py` regenerates the small browser
dialect from the firmware's pymavlink installation. No control algorithms are
reimplemented in JavaScript.

Publish the generated page and dependencies into the existing Pages repository:

```sh
python3 tools/publish_simulator.py ../../DavidIngraham.github.io/assets/microagu-viewer
```

Review and commit the generated files in that repository, then push its deployment
branch (`master`). The scoped `simulator-sw.js` supplies COOP/COEP headers for Pages;
it has no asset cache and leaves external requests alone. All simulator dependencies
are same-origin. Do not embed the simulator in an ordinary non-isolated iframe;
link to its standalone page.
