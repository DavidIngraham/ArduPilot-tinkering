import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  parseRecording,
  sample,
  position,
  orientation,
  type Frame,
} from "./state";
import { rigPayload, poseMechanisms, RotorPhase, phaseAt } from "./mechanisms";
const names = [
  "Damper off",
  "Original sign",
  "Reversed sign",
  "Current filter",
];
const laws = [
  "Δu = 0",
  "Δu = −0.10 qf · 10 Hz",
  "Δu = +0.10 qf · 10 Hz",
  "Δu = −0.10 qf · 2 × 1.5 Hz",
];
const canvas = document.createElement("canvas");
canvas.width = 1600;
canvas.height = 1040;
document.querySelector("#view")!.append(canvas);
const ctx = canvas.getContext("2d")!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(530, 340);
const tracks = await Promise.all(
  names.map(async (n) =>
    parseRecording(
      await (
        await fetch("pitch-sign/" + n.replaceAll(" ", "-") + ".jsonl")
      ).text(),
    ),
  ),
);
const scenes = await Promise.all(
  tracks.map(async (frames) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#142534");
    scene.add(new THREE.HemisphereLight(0xe3f7ff, 0x59606a, 3));
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(3, 8, 4);
    scene.add(sun);
    const body = new THREE.Group();
    const gltf = await new GLTFLoader().loadAsync(
      "models/microagu-payload-tl.glb",
    );
    body.add(gltf.scene);
    scene.add(body);
    const rig = rigPayload(gltf.scene);
    if (!rig) throw Error("CAD articulation missing");
    const clock = new RotorPhase();
    const phases = frames.map((f) => clock.advance(f.time_s, f.rpm));
    const ref = new THREE.GridHelper(4, 40, 0x647b89, 0x304856);
    ref.rotation.z = Math.PI / 2;
    scene.add(ref);
    const trail = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffb46a }),
    );
    scene.add(trail);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.009),
      new THREE.MeshBasicMaterial({ color: 0xffb46a }),
    );
    body.add(marker);
    marker.position.set(0.0053, 0, -0.102);
    const camera = new THREE.OrthographicCamera(
      (-0.525 * 530) / 340,
      (0.525 * 530) / 340,
      0.525,
      -0.525,
      0.01,
      100,
    );
    return { scene, body, rig, phases, camera, ref, trail };
  }),
);
const first = tracks[0][0];
const initial = position(first.state.slice(0, 3));
const velocity = position(first.state.slice(7, 10));
// A translating, fixed-orientation camera: never follows the actual oscillating body.
const offset = new THREE.Vector3(-0.32, -1.1, -0.06).applyQuaternion(
  orientation(first.state.slice(3, 7)),
);
const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(
  orientation(first.state.slice(3, 7)),
);
function pitch(f: Frame) {
  const q = new THREE.Quaternion().fromArray(f.state, 3);
  return (new THREE.Euler().setFromQuaternion(q, "ZYX").y * 180) / Math.PI;
}
function chart(
  data: Frame[],
  t: number,
  x: number,
  y: number,
  w: number,
  h: number,
  field: "pitch" | "throttle",
) {
  const lo = field === "pitch" ? -10 : 0,
    hi = field === "pitch" ? 30 : 60;
  ctx.fillStyle = "#10202d";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#385061";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#dce9f2";
  ctx.font = "16px system-ui";
  ctx.fillText(
    field === "pitch" ? "Payload pitch (°)" : "Throttle (%)",
    x,
    y - 9,
  );
  for (const v of [lo, (lo + hi) / 2, hi]) {
    const yy = y + h - ((v - lo) / (hi - lo)) * h;
    ctx.strokeStyle = "#263e4c";
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
    ctx.fillStyle = "#b1c3cf";
    ctx.fillText(String(v), x + 3, v === hi ? yy + 17 : yy - 3);
  }
  ctx.strokeStyle = field === "pitch" ? "#ffb46a" : "#a5bfff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  data
    .filter((f) => f.time_s <= t)
    .forEach((f, i) => {
      const v = field === "pitch" ? pitch(f) : 100 * (f.throttle ?? 0),
        xx = x + (f.time_s / 5.5) * w,
        yy = y + h - ((v - lo) / (hi - lo)) * h;
      i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    });
  ctx.stroke();
  ctx.fillStyle = "#b1c3cf";
  ctx.fillText(
    "0                    2.75                 5.5 s",
    x,
    y + h + 20,
  );
}
function draw(t: number, slow = false) {
  ctx.fillStyle = "#0b1520";
  ctx.fillRect(0, 0, 1600, 1040);
  ctx.fillStyle = "#e4edf4";
  ctx.font = "24px system-ui";
  ctx.fillText(
    "Pitch-feedback comparison · SolidWorks carriage · current 9-DOF plant",
    24,
    33,
  );
  ctx.font = "18px system-ui";
  ctx.fillText(
    `Simulated time ${t.toFixed(2)} s · ${slow ? "¼-speed replay" : "real-time playback"} · identical +5°/s disturbance at 2 s`,
    24,
    65,
  );
  for (let i = 0; i < 4; i++) {
    const x = 20 + (i % 2) * 800,
      y = 92 + Math.floor(i / 2) * 455,
      s = scenes[i],
      f = sample(tracks[i], t);
    const nominal = initial.clone().addScaledVector(velocity, t);
    s.body.position.copy(position(f.state.slice(0, 3)).sub(nominal));
    s.body.quaternion.copy(orientation(f.state.slice(3, 7)));
    poseMechanisms(
      s.rig,
      phaseAt(tracks[i], s.phases, t),
      f.brake_mm,
      tracks[i][0].brake_mm,
    );
    const target = new THREE.Vector3(0, -0.22, 0);
    s.camera.position.copy(target).add(offset);
    s.camera.lookAt(target);
    s.ref.position.set(-0.5, -0.22, 0);
    const points = tracks[i]
      .filter((g) => g.time_s >= t - 0.8 && g.time_s <= t)
      .map((g) =>
        new THREE.Vector3(0.0053, 0, -0.102)
          .applyQuaternion(orientation(g.state.slice(3, 7)))
          .add(position(g.state.slice(0, 3)))
          .sub(initial.clone().addScaledVector(velocity, g.time_s)),
      );
    s.trail.geometry.dispose();
    s.trail.geometry = new THREE.BufferGeometry().setFromPoints(points);
    renderer.render(s.scene, s.camera);
    ctx.drawImage(renderer.domElement, x, y + 52, 530, 340);
    ctx.fillStyle = "#e4edf4";
    ctx.font = "22px system-ui";
    ctx.fillText(names[i], x, y + 22);
    ctx.font = "16px system-ui";
    ctx.fillText(laws[i], x + 220, y + 22);
    chart(tracks[i], t, x + 552, y + 65, 210, 115, "pitch");
    chart(tracks[i], t, x + 552, y + 240, 210, 115, "throttle");
    ctx.fillStyle = "#ffb46a";
    ctx.font = "16px system-ui";
    ctx.fillText(
      "Orange point / trail: upper suspension attachment",
      x,
      y + 414,
    );
    const surge = s.body.position.dot(forward) * 100;
    ctx.fillStyle = "#dce9f2";
    ctx.fillText(
      `CG forward offset ${surge.toFixed(1)} cm · height offset ${(s.body.position.y * 100).toFixed(1)} cm`,
      x,
      y + 437,
    );
  }
  ctx.fillStyle = "#b1c3cf";
  ctx.font = "16px system-ui";
  ctx.fillText(
    "Fixed side-oblique camera follows the nominal straight path. Grid spacing 10 cm. Translation and rotation are unamplified.",
    24,
    1010,
  );
  ctx.fillText(
    "Standalone truth-rate diagnostic · fixed brakes · calm air · 1.758 kg · prop phase from simulated RPM (frame-rate aliasing possible)",
    24,
    1034,
  );
}
draw(4.5);
const button = document.querySelector<HTMLButtonElement>("#record")!;
button.disabled = false;
document.querySelector("#status")!.textContent = "Ready";
button.onclick = async () => {
  button.disabled = true;
  const chunks: Blob[] = [];
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: 8000000,
  });
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  recorder.onstop = () => {
    const a = document.querySelector<HTMLAnchorElement>("#save")!;
    a.href = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
    a.download = "pitch-sign-carriage.webm";
    a.hidden = false;
    document.querySelector("#status")!.textContent = "Video ready";
    button.disabled = false;
    stream.getTracks().forEach((t) => t.stop());
  };
  recorder.start();
  const start = performance.now();
  function tick(now: number) {
    const elapsed = (now - start) / 1000;
    const slow = elapsed >= 5.5;
    const t = slow ? 2 + (elapsed - 5.5) * 0.25 : elapsed;
    draw(Math.min(t, 5.5), slow);
    if (!slow) draw(t, false);
    document.querySelector("#status")!.textContent =
      `Recording ${elapsed.toFixed(1)} / 19.5 s`;
    if (elapsed < 19.5) requestAnimationFrame(tick);
    else recorder.stop();
  }
  requestAnimationFrame(tick);
};
