import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  sample,
  position,
  orientation,
  parseRecording,
  type Frame,
} from "./state";
import { rigPayload, poseMechanisms, RotorPhase, phaseAt } from "./mechanisms";

async function main() {
  const response = await fetch("landing/replay.json");
  if (!response.ok) throw Error("Could not load landing replay");
  const data = await response.json();
  const frames: Frame[] = parseRecording(JSON.stringify(data.frames));
  const first = frames[0].time_s,
    end = frames.at(-1)!.time_s,
    duration = end - first;
  const target = position(data.target_ned_m);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 1080;
  document.querySelector("#view")!.append(canvas);
  const ctx = canvas.getContext("2d")!;
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setSize(1280, 650);
  const scene = new T.Scene();
  scene.background = new T.Color("#142735");
  scene.add(new T.HemisphereLight(0xe6f8ff, 0x566473, 3));
  const sun = new T.DirectionalLight(0xffffff, 3);
  sun.position.set(3, 8, 4);
  scene.add(sun);
  const camera = new T.PerspectiveCamera(45, 1280 / 650, 0.01, 1000);
  const orbit = new OrbitControls(camera, canvas);
  orbit.enablePan = false;
  orbit.minDistance = 2;
  orbit.maxDistance = 100;
  const asset = await new GLTFLoader().loadAsync(
    "models/microagu-payload-tl.glb",
  );
  const body = new T.Group();
  body.add(asset.scene);
  scene.add(body);
  const rig = rigPayload(asset.scene);
  const vertices: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24 - 0.5) * Math.PI * 0.8;
    for (const x of [-0.27, 0.27])
      vertices.push(x, Math.sin(a) * 1.05, (1 - Math.cos(a)) * 0.45);
  }
  for (let i = 0; i < 24; i++) {
    const k = i * 2;
    indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const wing = new T.Mesh(
    geo,
    new T.MeshStandardMaterial({ color: 0x70c6ad, side: T.DoubleSide }),
  );
  scene.add(wing);
  const lines = new T.LineSegments(
    new T.BufferGeometry(),
    new T.LineBasicMaterial({ color: 0xc8d7e2 }),
  );
  scene.add(lines);
  // Earth-fixed floor: apparent flow comes entirely from the translating camera.
  const tile = document.createElement("canvas");
  tile.width = 128;
  tile.height = 128;
  const paint = tile.getContext("2d")!;
  paint.fillStyle = "#1b3542";
  paint.fillRect(0, 0, 128, 128);
  paint.strokeStyle = "#577785";
  paint.lineWidth = 3;
  paint.strokeRect(0, 0, 128, 128);
  const texture = new T.CanvasTexture(tile);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(600, 600);
  const floor = new T.Mesh(
    new T.PlaneGeometry(600, 600),
    new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.copy(target);
  floor.position.y = -0.002;
  scene.add(floor);
  for (const radius of [1, 2, 5]) {
    const ring = new T.Mesh(
      new T.RingGeometry(radius - 0.06, radius + 0.06, 100),
      new T.MeshBasicMaterial({ color: 0xffba68, side: T.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(target);
    ring.position.y = 0.012;
    scene.add(ring);
  }
  const dot = new T.Mesh(
    new T.CircleGeometry(0.13, 32),
    new T.MeshBasicMaterial({ color: 0xffba68, side: T.DoubleSide }),
  );
  dot.rotation.x = -Math.PI / 2;
  dot.position.copy(target);
  dot.position.y = 0.014;
  scene.add(dot);
  const rotor = new RotorPhase();
  const phases = frames.map((f) => rotor.advance(f.time_s, f.rpm));
  let time = 0,
    playing = true,
    last = performance.now(),
    recording = false;
  const slider = document.querySelector<HTMLInputElement>("#time")!;
  slider.max = String(duration);
  const play = document.querySelector<HTMLButtonElement>("#play")!;
  const startPos = position(frames[0].state.slice(0, 3));
  let previous = startPos.clone();
  camera.position.copy(startPos).add(new T.Vector3(8, 5, 6));
  orbit.target.copy(startPos);
  function draw(t: number) {
    const f = sample(frames, first + t),
      p = position(f.state.slice(0, 3));
    // Follow smooth translational state without changing the user's orbit angle.
    const delta = p.clone().sub(previous);
    camera.position.add(delta);
    orbit.target.add(delta);
    previous.copy(p);
    orbit.update();
    body.position.copy(p);
    body.quaternion.copy(orientation(f.state.slice(3, 7)));
    wing.position.copy(position(f.state.slice(13, 16)));
    wing.quaternion.copy(orientation(f.state.slice(16, 20)));
    if (rig)
      poseMechanisms(
        rig,
        phaseAt(frames, phases, f.time_s),
        f.brake_mm,
        frames[0].brake_mm,
      );
    const points: T.Vector3[] = [];
    for (const y of [-0.8, 0.8])
      for (const x of [-0.22, 0.22]) {
        points.push(
          new T.Vector3(x, y, 0.12)
            .applyQuaternion(wing.quaternion)
            .add(wing.position),
          new T.Vector3(0, y * 0.15, -0.1)
            .applyQuaternion(body.quaternion)
            .add(p),
        );
      }
    lines.geometry.dispose();
    lines.geometry = new T.BufferGeometry().setFromPoints(points);
    renderer.render(scene, camera);
    ctx.fillStyle = "#102330";
    ctx.fillRect(0, 0, 1280, 1080);
    ctx.drawImage(renderer.domElement, 0, 0);
    ctx.fillStyle = "#edf5ff";
    ctx.font = "22px system-ui";
    const distance = Math.hypot(
      f.state[0] - data.target_ned_m[0],
      f.state[1] - data.target_ned_m[1],
    );
    ctx.fillText(
      "Native AUTO landing · " +
        t.toFixed(1) +
        " s / " +
        duration.toFixed(1) +
        " s",
      24,
      36,
    );
    ctx.fillText(
      "Height " +
        (-f.state[2]).toFixed(1) +
        " m · target " +
        distance.toFixed(1) +
        " m · sink " +
        f.state[9].toFixed(2) +
        " m/s",
      24,
      680,
    );
    ctx.font = "18px system-ui";
    ctx.fillText(
      "Throttle " +
        ((f.throttle ?? 0) * 100).toFixed(0) +
        "%   Left brake " +
        f.brake_mm?.[0].toFixed(1) +
        " mm   Right brake " +
        f.brake_mm?.[1].toFixed(1) +
        " mm",
      24,
      713,
    );
    const wind = f.wind_ned_m_s ?? [0, 0, 0];
    ctx.fillText(
      "Wind N/E " + wind[0].toFixed(1) + " / " + wind[1].toFixed(1) + " m/s",
      850,
      713,
    );
    // Entire final-approach profile stays in earth coordinates, with a moving current-position marker.
    const x0 = frames[0].state[0],
      x1 = Math.max(data.target_ned_m[0] + 5, ...frames.map((x) => x.state[0]));
    const hmax = Math.max(...frames.map((x) => -x.state[2])) + 1;
    const px = (n: number) => 30 + ((n - x0) / (x1 - x0)) * 1200,
      py = (h: number) => 844 - (h / hmax) * 95;
    ctx.strokeStyle = "#749da9";
    ctx.beginPath();
    ctx.moveTo(30, 844);
    ctx.lineTo(1230, 844);
    ctx.stroke();
    ctx.strokeStyle = "#70c6ad";
    ctx.beginPath();
    frames.forEach((r, i) =>
      i
        ? ctx.lineTo(px(r.state[0]), py(-r.state[2]))
        : ctx.moveTo(px(r.state[0]), py(-r.state[2])),
    );
    ctx.stroke();
    ctx.fillStyle = "#ffba68";
    ctx.beginPath();
    ctx.arc(px(data.target_ned_m[0]), 844, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px(f.state[0]), py(-f.state[2]), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "16px system-ui";
    ctx.fillText(
      "Side profile · height exaggerated for readability · replay ends at first CG ground-plane crossing",
      24,
      880,
    );
    function graph(
      left: number,
      width: number,
      title: string,
      channels: { values: number[]; color: string }[],
      max: number,
    ) {
      ctx.fillStyle = "#edf5ff";
      ctx.font = "17px system-ui";
      ctx.fillText(title, left, 920);
      ctx.strokeStyle = "#506b7a";
      ctx.strokeRect(left, 935, width, 100);
      for (const channel of channels) {
        ctx.strokeStyle = channel.color;
        ctx.beginPath();
        frames.forEach((r, i) => {
          const x = left + ((r.time_s - first) / duration) * width,
            y = 1035 - (channel.values[i] / max) * 100;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(left + (t / duration) * width, 935);
      ctx.lineTo(left + (t / duration) * width, 1035);
      ctx.stroke();
    }
    graph(
      24,
      590,
      "Throttle · 0–100%",
      [
        {
          values: frames.map((r) => (r.throttle ?? 0) * 100),
          color: "#f2bd6b",
        },
      ],
      100,
    );
    graph(
      654,
      590,
      "Applied brake pull · left cyan / right pink · 0–90 mm",
      [
        { values: frames.map((r) => r.brake_mm?.[0] ?? 0), color: "#70c6ad" },
        { values: frames.map((r) => r.brake_mm?.[1] ?? 0), color: "#e495b8" },
      ],
      90,
    );
  }
  function loop(now: number) {
    if (playing) {
      time += Math.min(0.1, (now - last) / 1000);
      if (time > duration + 2 && !recording) time = 0;
    }
    last = now;
    slider.value = String(Math.min(time, duration));
    draw(Math.min(time, duration));
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  play.onclick = () => {
    playing = !playing;
    play.textContent = playing ? "Pause" : "Play";
  };
  slider.oninput = () => {
    time = Number(slider.value);
    playing = false;
    play.textContent = "Play";
  };
  document.querySelector<HTMLButtonElement>("#restart")!.onclick = () => {
    time = 0;
    playing = true;
    play.textContent = "Pause";
  };
  document.querySelector("#status")!.textContent = "Replay ready";
  document.querySelector<HTMLButtonElement>("#record")!.onclick = () => {
    if (recording) return;
    recording = true;
    time = 0;
    playing = true;
    last = performance.now();
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(canvas.captureStream(30), {
      mimeType: "video/webm",
      videoBitsPerSecond: 6000000,
    });
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      const a = document.querySelector<HTMLAnchorElement>("#save")!;
      a.href = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
      a.hidden = false;
      recording = false;
    };
    rec.start();
    setTimeout(() => rec.stop(), (duration + 1) * 1000);
  };
  (window as unknown as { landingDraw: (t: number) => void }).landingDraw = (
    t: number,
  ) => {
    time = Math.min(t, duration);
    playing = false;
    draw(time);
  };
}
main().catch(
  (e) => (document.querySelector("#status")!.textContent = String(e)),
);
