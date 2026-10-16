# Browser flight simulator

The [live flight simulator](https://davidingraham.github.io/assets/microagu-viewer/simulator.html)
runs MicroAGU's ArduPlane firmware locally in WebAssembly. No vehicle connection,
WebSocket server, or account is needed. Use a current browser with WebGL2,
SharedArrayBuffer and service worker support over HTTPS or localhost. The first
visit reloads once to enable cross-origin isolation on GitHub Pages.

## Flying

Wait for sensor initialization, then select **Launch to 60 m**. The native throw
assist launches in TAKEOFF. At 55 m the selected flight mode engages. Select a mode
and **Engage** to take control earlier. The top mode display is confirmed telemetry.

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

## Model and visual limits

This version uses the fork's **native rigid-body `paraglider-throw` SITL model**,
its embedded paraglider defaults, heading-rate steering and paraglider TECS. It is
not the Python/C++ 9-DOF canopy–payload research backend. The existing Three.js
canopy, SolidWorks payload, suspension lines and brake morphs are reused. The
visual canopy follows the payload attitude; brake motion is schematic PWM-scaled
deflection. Terrain is an illustrative flat field, not a map or elevation database.
The simulator is a development aid, not a validated flight-training model.

## Build and verify

The exact source revision and SHA-256 hashes are in `public/wasm/build.json`.
The corresponding source is public in the ArduPilot fork; binaries and source
are GPL-3.0-or-later. `public/wasm/COPYING.txt` accompanies the deployed build.

```sh
# Node >=22; Emscripten 6.0.8 installed at ~/emsdk
bash tools/build_sitl_wasm.sh /path/to/ardupilot-high-dof
cp ../COPYING.txt public/wasm/COPYING.txt
npm ci
npm test
node --import tsx tools/test_sitl_wasm.ts
npm run build
python3 -m http.server 5173 --directory dist
# Open http://localhost:5173/simulator.html
```

The integration test boots the actual packaged WASM, confirms MANUAL/FBWA/CRUISE,
uploads a mission, arms with normal prearm checks, launches, enters AUTO, and checks
that the aircraft moves. `tools/generate_mavlink.py` regenerates the small browser
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
