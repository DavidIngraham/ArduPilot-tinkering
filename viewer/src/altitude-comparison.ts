import {canopyGeometry, canopyMaterial, updateSuspension} from './paraglider';
import { cameraPath, cameraAt } from "./camera-path";
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
        await fetch("altitude-comparison/" + n.replaceAll(" ", "-") + ".jsonl")
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
    const canopy = new THREE.Group();
    scene.add(canopy);
    canopy.add(new THREE.Mesh(canopyGeometry(),canopyMaterial()));
    const lines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xa8c7cf }),
    );
    scene.add(lines);
    const centers = cameraPath(frames);
    camera.left = -2.1;
    camera.right = 2.1;
    camera.top = 1.35;
    camera.bottom = -1.35;
    camera.updateProjectionMatrix();
    ref.visible = false;
    trail.visible = false;
    marker.visible = false;
    return { scene, body, canopy, lines, rig, phases, camera, centers };
  }),
);
function angle(f: Frame, k: number) {
  return (
    (new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().fromArray(f.state, k),
      "ZYX",
    ).y *
      180) /
    Math.PI
  );
}
function plot(
  data: Frame[],
  t: number,
  x: number,
  y: number,
  kind: "height" | "angle" | "throttle",
) {
  const w = 215,
    h = 78,
    lo = kind === "height" ? 99 : kind === "angle" ? -60 : 0,
    hi = kind === "height" ? 106 : kind === "angle" ? 60 : 60;
  ctx.fillStyle = "#10202d";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#385061";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#e4edf4";
  ctx.font = "15px system-ui";
  ctx.fillText(
    kind === "height"
      ? "Altitude / target (m)"
      : kind === "angle"
        ? "Payload / canopy pitch (°)"
        : "Throttle (%)",
    x,
    y - 9,
  );
  for (const v of [lo, hi]) {
    ctx.fillStyle = "#b1c3cf";
    ctx.fillText(String(v), x + 3, v === hi ? y + 15 : y + h - 3);
  }
  const path = (
    value: (f: Frame) => number,
    color: string,
    dash: number[] = [],
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash(dash);
    ctx.beginPath();
    data
      .filter((f) => f.time_s <= t)
      .forEach((f, i) => {
        const xx = x + (f.time_s / 50) * w,
          yy = y + h - ((value(f) - lo) / (hi - lo)) * h;
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      });
    ctx.stroke();
    ctx.setLineDash([]);
  };
  if (kind === "height") {
    path((f) => (f.time_s < 5 ? 100 : 105), "#ffffff", [4, 3]);
    path((f) => -f.state[2], "#9ccaff");
  } else if (kind === "angle") {
    path((f) => angle(f, 3), "#ffb46a");
    path((f) => angle(f, 16), "#70d8c6");
  } else path((f) => 100 * (f.throttle ?? 0), "#a5bfff");
  ctx.fillStyle = "#aabdc9";
  ctx.fillText("0", x, y + h + 17);
  ctx.fillText("25", x + w / 2 - 8, y + h + 17);
  ctx.fillText("50 s", x + w - 30, y + h + 17);
}
function draw(t: number) {
  ctx.fillStyle = "#0b1520";
  ctx.fillRect(0, 0, 1600, 1040);
  ctx.fillStyle = "#e4edf4";
  ctx.font = "24px system-ui";
  ctx.fillText("Altitude-command response · current 9-DOF plant", 24, 32);
  ctx.font = "18px system-ui";
  ctx.fillText(
    `Time ${t.toFixed(1)} s · target ${t < 5 ? 100 : 105} m · +5 m command at 5 s · real-time playback`,
    24,
    65,
  );
  for (let i = 0; i < 4; i++) {
    const x = 20 + (i % 2) * 800,
      y = 92 + Math.floor(i / 2) * 455,
      s = scenes[i],
      f = sample(tracks[i], t),
      origin = cameraAt(tracks[i], s.centers, t);
    s.body.position.copy(position(f.state.slice(0, 3)).sub(origin));
    s.body.quaternion.copy(orientation(f.state.slice(3, 7)));
    s.canopy.position.copy(position(f.state.slice(13, 16)).sub(origin));
    s.canopy.quaternion.copy(orientation(f.state.slice(16, 20)));
    poseMechanisms(
      s.rig,
      phaseAt(tracks[i], s.phases, t),
      f.brake_mm,
      tracks[i][0].brake_mm,
    );
    updateSuspension(s.lines,s.body,s.canopy);
    const target = new THREE.Vector3(0, 0.65, 0);
    s.camera.position
      .copy(target)
      .add(
        new THREE.Vector3(-0.7, -4, -0.6).applyQuaternion(
          orientation(tracks[0][0].state.slice(3, 7)),
        ),
      );
    s.camera.lookAt(target);
    renderer.render(s.scene, s.camera);
    ctx.drawImage(renderer.domElement, x, y + 52, 530, 340);
    // Pitch-angle glyph in the body longitudinal plane, independent of camera projection.
    const ax = x + 438,
      ay = y + 106;
    ctx.strokeStyle = "#78929f";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax - 60, ay);
    ctx.lineTo(ax + 60, ay);
    ctx.stroke();
    for (const [k, color, r] of [
      [3, "#ffb46a", 47],
      [16, "#70d8c6", 60],
    ] as const) {
      const th = (angle(f, k) * Math.PI) / 180;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax - r * Math.cos(th), ay + r * Math.sin(th));
      ctx.lineTo(ax + r * Math.cos(th), ay - r * Math.sin(th));
      ctx.stroke();
    }
    ctx.fillStyle = "#aabdc9";
    ctx.font = "13px system-ui";
    ctx.fillText("Pitch / horizon", ax - 50, ay + 53);
    ctx.fillStyle = "#e4edf4";
    ctx.font = "22px system-ui";
    ctx.fillText(names[i], x, y + 22);
    ctx.font = "16px system-ui";
    ctx.fillText(laws[i], x + 215, y + 22);
    plot(tracks[i], t, x + 550, y + 60, "height");
    plot(tracks[i], t, x + 550, y + 185, "angle");
    plot(tracks[i], t, x + 550, y + 310, "throttle");
    ctx.fillStyle = "#ffb46a";
    ctx.font = "17px system-ui";
    ctx.fillText(`Payload pitch ${angle(f, 3).toFixed(1)}°`, x + 8, y + 78);
    ctx.fillStyle = "#70d8c6";
    ctx.fillText(`Canopy pitch ${angle(f, 16).toFixed(1)}°`, x + 8, y + 101);
    ctx.fillStyle = "#e4edf4";
    ctx.fillText(
      `Altitude ${(-f.state[2]).toFixed(2)} m · climb ${(-f.state[9]).toFixed(2)} m/s`,
      x,
      y + 420,
    );
    ctx.fillText(
      `Pitch difference ${(angle(f, 3) - angle(f, 16)).toFixed(1)}° · throttle ${((f.throttle ?? 0) * 100).toFixed(1)}%`,
      x,
      y + 443,
    );
  }
  ctx.fillStyle = "#b1c3cf";
  ctx.font = "16px system-ui";
  ctx.fillText(
    "Standalone truth-sensed height loop · same lateral controller · calm air · 1.758 kg · 22.2 V · pitch dampers enabled with command",
    24,
    1010,
  );
  ctx.fillText(
    "SolidWorks carriage; schematic canopy. Camera follows smoothed translation at fixed orientation. Angles are attitudes, not angle of attack.",
    24,
    1034,
  );
}
draw(12);
const button = document.querySelector<HTMLButtonElement>("#record")!;
button.disabled = false;
document.querySelector("#status")!.textContent = "Ready";
button.onclick = () => {
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
    a.download = "altitude-comparison.webm";
    a.hidden = false;
    document.querySelector("#status")!.textContent = "Video ready";
    button.disabled = false;
    stream.getTracks().forEach((t) => t.stop());
  };
  recorder.start();
  const start = performance.now();
  function tick(now: number) {
    const t = Math.min(50, (now - start) / 1000);
    draw(t);
    document.querySelector("#status")!.textContent =
      `Recording ${t.toFixed(1)} / 50 s`;
    if (t < 50) requestAnimationFrame(tick);
    else recorder.stop();
  }
  requestAnimationFrame(tick);
};
