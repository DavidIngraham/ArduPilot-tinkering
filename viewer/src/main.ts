import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  Frame,
  parseRecording,
  validate,
  sample,
  position,
  orientation,
} from "./state";
import "./style.css";
import { RotorPhase, rigPayload, poseMechanisms, phaseAt } from "./mechanisms";
import type { Mechanisms } from "./mechanisms";
let mechanisms: Mechanisms | null = null;
let brakeReference: number[] | null = null;
let rotorPhases: number[] = [];
const rotorClock = new RotorPhase();
function indexMechanisms(data: Frame[]) {
  rotorClock.reset();
  rotorPhases = data.map((f) => rotorClock.advance(f.time_s, f.rpm));
  brakeReference =
    data.find((f) => f.brake_mm !== null)?.brake_mm?.slice() ?? null;
}
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#132331");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const host = el("scene");
host.append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 20000);
camera.position.set(4, 3, 6);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xd7f3ff, 0x405341, 2.8));
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(10, 30, 10);
scene.add(sun);
const grid = new THREE.GridHelper(2000, 200, 0x405b68, 0x223b48);
scene.add(grid);
const payload = new THREE.Group(),
  canopy = new THREE.Group();
scene.add(payload, canopy);
const solid = (color: number) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
const placeholder = new THREE.Group();
payload.add(placeholder);
const box = new THREE.Mesh(
  new THREE.BoxGeometry(0.16, 0.15, 0.23),
  solid(0xe0dac8),
);
placeholder.add(box);
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(0.135, 0.006, 8, 64),
  solid(0xbabfb7),
);
ring.rotation.y = Math.PI / 2;
ring.position.x = -0.13;
placeholder.add(ring);
const prop = new THREE.Mesh(
  new THREE.BoxGeometry(0.008, 0.2286, 0.018),
  solid(0x313a40),
);
prop.position.x = -0.14;
placeholder.add(prop);
// Canopy cross-section is schematic; body local axes remain FRD.
const geo = new THREE.BufferGeometry(),
  verts: number[] = [],
  indices: number[] = [];
for (let i = 0; i <= 24; i++) {
  const u = (i / 24 - 0.5) * Math.PI * 0.8,
    y = Math.sin(u) * 1.05,
    z = (1 - Math.cos(u)) * 0.45;
  for (const x of [-0.3, 0.3]) verts.push(x, y, z + (x < 0 ? 0.04 : 0));
}
for (let i = 0; i < 24; i++) {
  const k = i * 2;
  indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
}
geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
geo.setIndex(indices);
geo.computeVertexNormals();
canopy.add(new THREE.Mesh(geo, solid(0x77dfb5)));
const axes = [new THREE.AxesHelper(0.4), new THREE.AxesHelper(0.6)];
payload.add(axes[0]);
canopy.add(axes[1]);
const lines = new THREE.LineSegments(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({
    color: 0xabc3cc,
    transparent: true,
    opacity: 0.65,
  }),
);
scene.add(lines);
let path = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({
    color: 0x50b7aa,
    transparent: true,
    opacity: 0.65,
  }),
);
scene.add(path);
let frames: Frame[] = [],
  cursor = 0,
  playing = false,
  live = false,
  socket: WebSocket | undefined,
  previous = performance.now();
const origin = new THREE.Vector3();
let haveOrigin = false,
  lastMode = "",
  lastTarget = new THREE.Vector3();
const error = (e: unknown) => {
  el("error").textContent = e instanceof Error ? e.message : String(e);
};
function updatePath() {
  const stride = Math.max(1, Math.ceil(frames.length / 6000));
  const points = frames
    .filter((_, i) => i % stride === 0)
    .map((f) => position(f.state.slice(0, 3)).sub(origin));
  path.geometry.dispose();
  path.geometry = new THREE.BufferGeometry().setFromPoints(points);
}
function resetView(f: Frame) {
  origin.copy(position(f.state.slice(0, 3)));
  origin.y = 0;
  haveOrigin = true;
  lastMode = "";
  updatePath();
}
function load(data: Frame[], name: string) {
  socket?.close();
  socket = undefined;
  live = false;
  frames = data;
  indexMechanisms(data);
  cursor = data[0].time_s;
  playing = false;
  resetView(data[0]);
  el("status").textContent = `${name} · ${data.length.toLocaleString()} frames`;
  el<HTMLButtonElement>("play").disabled = false;
  el("play").textContent = "Play";
  el("connect").textContent = "Connect live";
  el("empty").hidden = true;
  el("error").textContent = "";
}
el<HTMLInputElement>("recording").onchange = async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f)
    try {
      load(parseRecording(await f.text()), f.name);
    } catch (e) {
      error(e);
    }
};
el("play").onclick = () => {
  if (!frames.length || live) return;
  if (cursor >= frames.at(-1)!.time_s) cursor = frames[0].time_s;
  playing = !playing;
  el("play").textContent = playing ? "Pause" : "Play";
};
el<HTMLInputElement>("scrub").oninput = (e) => {
  if (!live) {
    cursor = Number((e.target as HTMLInputElement).value);
    playing = false;
    el("play").textContent = "Play";
  }
};
el("connect").onclick = () => {
  if (socket) {
    socket.close();
    socket = undefined;
    live = false;
    el("connect").textContent = "Connect live";
    el<HTMLButtonElement>("play").disabled = !frames.length;
    el("status").textContent =
      "Disconnected · received frames available for replay";
    return;
  }
  try {
    const ws = new WebSocket(el<HTMLInputElement>("url").value);
    socket = ws;
    ws.onopen = () => {
      if (socket !== ws) return;
      frames = [];
      indexMechanisms([]);
      live = true;
      haveOrigin = false;
      playing = false;
      el("empty").hidden = true;
      el("connect").textContent = "Disconnect";
      el<HTMLButtonElement>("play").disabled = true;
    };
    ws.onmessage = (e) => {
      if (socket !== ws) return;
      try {
        const f = validate(JSON.parse(e.data));
        if (frames.length && f.time_s < frames.at(-1)!.time_s) {
          frames = [];
          indexMechanisms([]);
          haveOrigin = false;
        }
        if (frames.length && f.time_s === frames.at(-1)!.time_s) return;
        frames.push(f);
        rotorPhases.push(rotorClock.advance(f.time_s, f.rpm));
        if (brakeReference === null && f.brake_mm)
          brakeReference = f.brake_mm.slice();
        if (frames.length > 1800) {
          frames.shift();
          rotorPhases.shift();
        }
        if (!haveOrigin) resetView(f);
        if (frames.length === 1 || cursor < f.time_s - 0.25)
          cursor = Math.max(frames[0].time_s, f.time_s - 0.075);
        el("status").textContent =
          `Live · ${f.released ? "physics released" : "initialization trim"} · ${f.time_s.toFixed(1)} s`;
        if (frames.length % 15 === 0) updatePath();
      } catch (e) {
        error(e);
      }
    };
    ws.onerror = () =>
      error(
        "Cannot reach the local bridge. Start tools/bridge.py and check the URL.",
      );
    ws.onclose = () => {
      if (socket === ws) {
        socket = undefined;
        live = false;
        el("connect").textContent = "Connect live";
        el<HTMLButtonElement>("play").disabled = !frames.length;
        el("status").textContent =
          "Disconnected · received frames available for replay";
      }
    };
  } catch (e) {
    error(e);
  }
};
function setPayload(model: THREE.Group, label: string) {
  for (const child of [...payload.children])
    if (child !== axes[0]) {
      payload.remove(child);
      child.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
        }
      });
    }
  payload.add(model);
  mechanisms = rigPayload(model);
  el("asset-label").textContent = label;
}
new GLTFLoader()
  .loadAsync(
    `${new URL(".", document.baseURI).pathname}models/microagu-payload-tl.glb`,
  )
  .then((model) => {
    if (placeholder.parent)
      setPayload(
        model.scene,
        "SolidWorks payload · Trout Lake CG · schematic canopy",
      );
  })
  .catch(error);
el<HTMLInputElement>("asset").onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const model = await new GLTFLoader().parseAsync(
      await file.arrayBuffer(),
      "",
    );
    setPayload(model.scene, `Payload: ${file.name} · canopy schematic`);
  } catch (e) {
    error(e);
  }
};
function draw(f: Frame) {
  payload.position.copy(position(f.state.slice(0, 3)).sub(origin));
  canopy.position.copy(position(f.state.slice(13, 16)).sub(origin));
  payload.quaternion.copy(orientation(f.state.slice(3, 7)));
  canopy.quaternion.copy(orientation(f.state.slice(16, 20)));
  const phase = phaseAt(frames, rotorPhases, f.time_s);
  prop.rotation.x = phase;
  if (mechanisms) poseMechanisms(mechanisms, phase, f.brake_mm, brakeReference);
  const endpoints: number[] = [];
  for (const side of [-1, 1])
    for (const fore of [-1, 1]) {
      const p = payload.localToWorld(
          new THREE.Vector3(0.0053, side * 0.1, -0.102),
        ),
        c = canopy.localToWorld(
          new THREE.Vector3(fore * 0.22, side * 0.72, 0.15),
        );
      endpoints.push(...p.toArray(), ...c.toArray());
    }
  lines.geometry.dispose();
  lines.geometry = new THREE.BufferGeometry();
  lines.geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(endpoints, 3),
  );
  axes.forEach((a) => (a.visible = el<HTMLInputElement>("axes").checked));
  path.visible = el<HTMLInputElement>("path").checked;
  const mode = el<HTMLSelectElement>("camera").value,
    target =
      mode === "inspect"
        ? payload.position.clone().lerp(canopy.position, 0.5)
        : payload.position.clone();
  if (mode !== lastMode) {
    const offset =
      mode === "payload"
        ? new THREE.Vector3(0.55, 0.25, 0.65)
        : mode === "inspect"
          ? new THREE.Vector3(2, 1, 3)
          : mode === "ground"
            ? new THREE.Vector3(20, -target.y + 2, 30)
            : new THREE.Vector3(7, 4, 10);
    camera.position.copy(target).add(offset);
    orbit.target.copy(target);
    lastTarget.copy(target);
    lastMode = mode;
  }
  if (mode !== "ground") {
    camera.position.add(target.clone().sub(lastTarget));
    orbit.target.add(target.clone().sub(lastTarget));
  }
  lastTarget.copy(target);
  el("numbers").innerHTML = [
    ["Time", `${f.time_s.toFixed(2)} s`],
    ["Altitude (NED origin)", `${(-f.state[2]).toFixed(1)} m`],
    ["Speed", `${Math.hypot(...f.state.slice(7, 10)).toFixed(2)} m/s`],
    ["Climb", `${(-f.state[9]).toFixed(2)} m/s`],
    [
      "Rotor",
      f.rpm === null ? "Not recorded · static" : `${f.rpm.toFixed(0)} rpm`,
    ],
    [
      "Capstans",
      f.brake_mm
        ? f.brake_mm.map((v) => v.toFixed(1)).join(" / ") + " mm"
        : "Not recorded · static",
    ],
    ["Voltage", `${f.voltage_v.toFixed(2)} V`],
    [
      "Joint roll / pitch / yaw",
      f.joint_rotvec_rad
        .map((v) => ((v * 180) / Math.PI).toFixed(1))
        .join(" / ") + "°",
    ],
    [
      "Relative rate",
      f.joint_rate_rad_s
        .map((v) => ((v * 180) / Math.PI).toFixed(1))
        .join(" / ") + " °/s",
    ],
  ]
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
    .join("");
  el("clock").textContent = `${cursor.toFixed(2)} s`;
  const scrub = el<HTMLInputElement>("scrub");
  scrub.min = String(frames[0].time_s);
  scrub.max = String(frames.at(-1)!.time_s);
  scrub.value = String(cursor);
  scrub.disabled = live;
}
function chart(id: string, values: (f: Frame) => number[]) {
  const canvas = el<HTMLCanvasElement>(id),
    ctx = canvas.getContext("2d")!;
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  if (!frames.length) return;
  const stride = Math.max(1, Math.ceil(frames.length / 700));
  const subset = frames.filter((_, i) => i % stride === 0),
    data = subset.map(values);
  let lo = Infinity,
    hi = -Infinity;
  for (const row of data)
    for (const v of row) {
      if (Number.isFinite(v)) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
  if (!Number.isFinite(lo)) {
    ctx.fillStyle = "#8da4b5";
    ctx.font = "12px system-ui";
    ctx.fillText("Actuation was not recorded in this trace", 20, 70);
    return;
  }
  if (hi - lo < 1) {
    lo -= 0.5;
    hi += 0.5;
  }
  const pad = (hi - lo) * 0.1;
  lo -= pad;
  hi += pad;
  const t0 = frames[0].time_s,
    t1 = frames.at(-1)!.time_s;
  const x = (t: number) => 42 + ((w - 50) * (t - t0)) / Math.max(0.01, t1 - t0),
    y = (v: number) => h - 20 - ((h - 30) * (v - lo)) / (hi - lo);
  ctx.font = "10px system-ui";
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4;
    ctx.strokeStyle = "#29414e";
    ctx.beginPath();
    ctx.moveTo(40, y(v));
    ctx.lineTo(w, y(v));
    ctx.stroke();
    ctx.fillStyle = "#8da4b5";
    ctx.fillText(v.toFixed(1), 0, y(v) + 3);
  }
  ["#60dec2", "#ffbc72", "#92a6ff"].forEach((color, j) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    subset.forEach((f, i) => {
      if (!Number.isFinite(data[i][j])) return;
      if (i) ctx.lineTo(x(f.time_s), y(data[i][j]));
      else ctx.moveTo(x(f.time_s), y(data[i][j]));
    });
    ctx.stroke();
  });
  ctx.strokeStyle = "#eef6fa";
  ctx.beginPath();
  ctx.moveTo(x(cursor), 0);
  ctx.lineTo(x(cursor), h - 18);
  ctx.stroke();
  ctx.fillStyle = "#8da4b5";
  ctx.fillText(`${t0.toFixed(1)} s`, 42, h - 3);
  ctx.fillText(`${t1.toFixed(1)} s`, w - 48, h - 3);
}
let chartTime = 0;
function animate(now: number) {
  const dt = Math.min(0.1, (now - previous) / 1000);
  previous = now;
  if (frames.length) {
    if (live) cursor = Math.min(frames.at(-1)!.time_s, cursor + dt);
    if (playing && !live) {
      cursor = Math.min(
        frames.at(-1)!.time_s,
        cursor + dt * Number(el<HTMLSelectElement>("speed").value),
      );
      if (cursor === frames.at(-1)!.time_s) {
        playing = false;
        el("play").textContent = "Play";
      }
    }
    draw(sample(frames, cursor));
  }
  if (now - chartTime > 80) {
    chart("joint-chart", (f) =>
      f.joint_rotvec_rad.map((v) => (v * 180) / Math.PI),
    );
    chart("control-chart", (f) => [
      f.throttle === null ? NaN : f.throttle * 100,
      ...(f.brake_mm ?? [NaN, NaN]),
    ]);
    chartTime = now;
  }
  orbit.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
new ResizeObserver(() => {
  const w = host.clientWidth,
    h = host.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}).observe(host);
requestAnimationFrame(animate);
// Optional local recording link, e.g. ?recording=/recordings/run.jsonl.
const source = new URLSearchParams(location.search).get("recording");
if (source)
  fetch(source)
    .then((r) => {
      if (!r.ok) throw Error(`Recording HTTP ${r.status}`);
      return r.text();
    })
    .then((t) => load(parseRecording(t), source.split("/").pop()!))
    .catch(error);
