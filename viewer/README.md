# Micro-AGU flight viewer

A local Three.js / TypeScript engineering viewer for the 9-DOF paraglider model.
Physics and controllers remain in ArduPilot's `paraglider-high-dof-control` branch.
This directory owns the UI, trace conversion, WebSocket bridge, and recording.
No browser physics or WASM is involved. AI-assisted implementation.

## Run

Node 22+, Python 3.10+:

```sh
cd viewer
npm ci
npm run dev -- --strictPort
# Open http://127.0.0.1:5173
```

Open a JSONL recording with **Open recording**. Playback supports pause, scrubbing,
0.25–4× speed, quaternion interpolation, four orbitable camera modes, body axes,
flight paths, and synchronized joint/actuation charts. The ground grid is 10 m;
it is a datum plane, not terrain. Mouse drag orbits; wheel zooms; right drag pans.
**Inspect joint** gives a closer view of the two bodies.

### Existing research traces

```sh
python -m pip install -r tools/requirements.txt
python tools/convert_trace.py \
  /path/to/high-dof-trace.npz /path/to/replay.jsonl --voltage 22.2
```

The native autotest's `samples` array contains `[time, released, state[26]]`.
It does **not** contain RPM or actuator positions. These remain `null` and the UI
says “Not recorded”; no values are reconstructed or invented. Voltage is explicit
because these old traces don't record it either: use the run's physical voltage.

The converter also accepts `t`, `state`, `rpm`, and `commands` arrays from simulator
replays. `commands` must be the physical model inputs `[throttle, left_mm, right_mm]`;
for rate-limited replays, supply **applied** travel, not pre-actuator demands.
Output creation is exclusive to prevent accidentally replacing a recording.
Raw traces and generated JSONL are ignored by Git and should stay in the existing
research-data locations. Nothing needs uploading to a service.

### Live simulator

Start the bridge in another terminal:

```sh
cd viewer
python tools/bridge.py --udp 9010 --port 8765 --record /path/to/new-run.jsonl
```

Then start the backend on the ArduPilot feature branch:

```sh
cd /path/to/ardupilot/Tools/simulation/paraglider
python json_backend.py --flight trout_lake --profile mission \
  --voltage 22.2 --viewer-port 9010 --viewer-hz 30
```

Start SITL with the existing `sim_vehicle.py` JSON-model command and parameter
files documented in that model's README. Initialize/arm/select mode, then press
Enter in the backend terminal to release, as before. Click **Connect live** in the
viewer. This is a passive viewer: disconnecting does not stop the simulation.
Existing autotest wrappers that instantiate `Backend` directly do not start the
CLI's UDP output; their saved pose traces can be converted instead.

All services bind to loopback; no network-facing server is created. In WSL, run
backend, bridge, and Vite in the same distro; Windows can reach the forwarded
localhost ports. The bridge accepts the standard Vite dev/preview origins only.
It retains one pending message per client and drops superseded frames for slow
clients. The backend uses nonblocking UDP and drops send failures without waiting.
The output rate is **simulation Hz**, so accelerated SITL may emit faster in wall
clock time. Live UI history is limited to 1,800 frames; disconnect to replay those
frames, or load the full recording from disk. Recordings flush every 30 frames.
A simulator restart stops the current recording to avoid mixing time epochs;
restart the bridge with a new filename to record the new run.

## State contract: `microagu.state.v1`

One JSON object per UDP datagram, WebSocket message, or JSONL line.

- `time_s`: simulation seconds, strictly increasing within a recording.
- `state`: 26 finite numbers. Payload occupies indices 0–12, canopy 13–25.
  Each body's layout is `[position_NED(3), quaternion_xyzw(4), velocity_NED(3), angular_velocity_NED(3)]`.
  Quaternions map **body FRD to world NED**. Positions are body CGs in metres.
- `joint_rotvec_rad`: rotation vector of `R_payload^-1 R_canopy`, expressed in
  payload axes. These are the spring model's joint coordinates, **not Euler angles**.
- `joint_rate_rad_s`: `R_payload^-1 (omega_canopy - omega_payload)`.
  Relative angular velocity, not generally the derivative of the rotation vector.
- `brake_mm`: actual left/right actuator positions, before slack/preload adjustment.
- `throttle`: bounded model throttle command, 0–1.
- `rpm`, `voltage_v`: rotor speed and physical supply voltage.
- `released`: false during translating initialization trim, true after release.

RPM, throttle, and brake travel may be `null` only for legacy recordings with
missing channels. The live exporter provides them. The bridge requires complete
live frames. Joint coordinates are derived from the poses, not autopilot estimates.
The viewer uses the proper rotation `[N,E,D] -> [E,-D,-N]` and interpolates body
quaternions using shortest-path slerp. It never feeds truth back into the autopilot.

## SolidWorks assets

The default model is your `microAGU.SLDASM`, exported through the running
SOLIDWORKS 2026 typed COM API. The native export was 21.3 MB; the prepared viewer
asset is 1.68 MB. It retains the named assembly hierarchy and mechanisms, removes
cameras and internal M3 fasteners, and welds/deduplicates/quantizes the meshes.
`public/models/microagu-payload-tl.glb.json` records provenance and checksums.

The asset is aligned using the simulator's existing **estimated nominal Trout Lake
CG** and `FRD = [CADx, -CADy, -CADz]`. This is not a new CG measurement. The canopy
and suspension lines remain schematic, and the added lead is not represented in
CAD. The CAD prop is named **APC 9x6**, while the flown prop was **9x4.5**; its mesh
is a visual asset and does not change the physics model.

To repeat the export, run this with Windows PowerShell 5.1 while SolidWorks is open:

```powershell
.\tools\export_solidworks.ps1 -Source "C:\path\microAGU.SLDASM" -Destination "C:\path\raw.glb"
```

The script locates the installed interop DLL, connects to the running application,
opens the assembly read-only if needed, and exports a separate copy. It never
saves over the source CAD. If Windows blocks an unsigned script on a UNC share,
copy this authored script into your local working folder and run it there.

Prepare a new output (the tool refuses to overwrite an existing file):

```sh
node tools/prepare_asset.mjs /path/to/raw.glb \
  /path/to/ardupilot/Tools/simulation/paraglider/napkin-payload-model.json \
  /path/to/payload-tl.glb
```

Use **Load payload GLB** for other self-contained GLB assets. Prepare these in
metres with the **payload CG at the origin**, X forward, Y right, Z down. Y-up
exports need reorientation first. Retain named rotor/drum nodes for future
articulation. Imported payloads currently move as rigid assemblies; internal
rotor/drum animation is not implemented. The fallback schematic propeller's phase
is a visual indication of RPM, not a recorded shaft angle. Force arrows are absent
until the simulator exports consistently defined force components.

## Build and checks

```sh
npm test
npm run build
python -m unittest discover -s tools -p 'test_*.py'
python tools/check_live.py --model-dir /path/to/ardupilot/Tools/simulation/paraglider
# Native exporter/protocol checks, from ArduPilot model directory:
python -m unittest test_json_backend
```

`npm run preview -- --strictPort` serves the production build on port 4173.
Build output and local data are ignored. Third-party runtime: Three.js (MIT).
The viewer source follows the repository's GPL license.

Validation performed: production build, coordinate/sign and quaternion interpolation
checks, replay input rejection, bridge backpressure/reset recording checks, native
protocol tests with real physics stepping, and backend CLI → UDP → WebSocket →
recording integration (400 lockstep responses, 29 truth frames). Browser inspection
used the 432-second `voltage_22_2_on` native SITL recording and the exported CAD;
playback, timeline seeking, camera switching, and plots were checked. No controller
parameters or physics equations were changed.
