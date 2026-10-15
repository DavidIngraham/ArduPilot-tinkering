import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { position, orientation } from "./state";
import {
  parseFlight,
  flightAt,
  type FlightReplay,
  type FlightFrame,
} from "./flight-state";
import { rigPayload, poseMechanisms } from "./mechanisms";
async function main() {
  const el = <T extends HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 980;
  el("view").append(canvas);
  const ctx = canvas.getContext("2d")!;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#142534");
  scene.add(new THREE.HemisphereLight(0xe1f5ff, 0x505d65, 3));
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.position.set(4, 10, 3);
  scene.add(sun);
  const body = new THREE.Group();
  body.add(
    (
      await new GLTFLoader().loadAsync(
        new URL("models/microagu-payload-tl.glb", document.baseURI).href,
      )
    ).scene,
  );
  scene.add(body);
  const rig = rigPayload(body);
  if (!rig) throw Error("CAD rig missing");
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  const mapScene = new THREE.Scene();
  mapScene.background = new THREE.Color("#101f2a");
  const mapCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 10000);
  const route = new THREE.Group();
  mapScene.add(route);
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(2),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  mapScene.add(marker);
  const colors: Record<string, string> = {
    MANUAL: "#ffb46a",
    FBWA: "#9ccaff",
    CRUISE: "#d2a2ff",
    LOITER: "#e6cf65",
    AUTO: "#70d8a2",
    GUIDED: "#ea91ca",
  };
  let data: FlightReplay,
    frames: FlightFrame[] = [],
    cursor = 0,
    playing = false,
    recording = false,
    last = performance.now(),
    center = new THREE.Vector3(),
    span = 100;
  function att(f: FlightFrame) {
    return new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().fromArray(f.q),
      "ZYX",
    );
  }
  function load(text: string) {
    data = parseFlight(text);
    frames = data.frames;
    cursor = frames[0].t;
    playing = false;
    route.clear();
    const pts = frames.filter((_, i) => i % 5 === 0);
    const box = new THREE.Box3();
    pts.forEach((f) => box.expandByPoint(position(f.p)));
    box.getCenter(center);
    span = Math.max(...box.getSize(new THREE.Vector3()).toArray(), 10);
    const byMode: Record<string, THREE.Vector3[]> = {};
    for (let i = 1; i < pts.length; i++) {
      if (!pts[i].valid || !pts[i - 1].valid) continue;
      (byMode[pts[i].mode] ??= []).push(
        position(pts[i - 1].p),
        position(pts[i].p),
      );
    }
    for (const [mode, vertices] of Object.entries(byMode))
      route.add(
        new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints(vertices),
          new THREE.LineBasicMaterial({ color: colors[mode] ?? "#dce9f3" }),
        ),
      );
    const grid = new THREE.GridHelper(
      Math.ceil(span / 50) * 50,
      Math.ceil(span / 50),
      0x547183,
      0x294250,
    );
    grid.position.set(center.x, 0, center.z);
    route.add(grid);
    for (const dir of [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, -1),
    ])
      route.add(
        new THREE.ArrowHelper(dir, new THREE.Vector3(), 30, 0xb5cfdf, 4, 2),
      );
    marker.scale.setScalar(span / 150);
    el<HTMLInputElement>("time").min = String(frames[0].t);
    el<HTMLInputElement>("time").max = String(frames.at(-1)!.t);
    for (const id of ["play", "record", "overview"])
      el<HTMLButtonElement>(id).disabled = false;
    el("status").textContent =
      "Measured payload replay · canopy attitude and RPM unavailable";
    draw(cursor, "Paused");
  }
  function map(x: number, y: number, w: number, h: number, f: FlightFrame) {
    renderer.setSize(w, h, false);
    mapCamera.aspect = w / h;
    mapCamera.updateProjectionMatrix();
    mapCamera.position
      .copy(center)
      .add(new THREE.Vector3(0.85, 0.65, 0.95).multiplyScalar(span));
    mapCamera.lookAt(center);
    marker.position.copy(position(f.p));
    renderer.render(mapScene, mapCamera);
    ctx.drawImage(renderer.domElement, x, y, w, h);
    ctx.fillStyle = "#cfe1ec";
    ctx.font = "15px system-ui";
    for (const [label, v] of [
      ["E", new THREE.Vector3(33, 0, 0)],
      ["Up", new THREE.Vector3(0, 33, 0)],
      ["N", new THREE.Vector3(0, 0, -33)],
    ] as const) {
      const p = v.clone().project(mapCamera);
      ctx.fillText(label, x + ((p.x + 1) * w) / 2, y + ((1 - p.y) * h) / 2);
    }
  }
  function graph(
    t: number,
    x: number,
    y: number,
    w: number,
    h: number,
    kind: "attitude" | "control",
  ) {
    const low = kind === "attitude" ? -90 : 0,
      high = kind === "attitude" ? 90 : 100;
    ctx.fillStyle = "#122331";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#dce9f3";
    ctx.font = "18px system-ui";
    ctx.fillText(
      kind === "attitude"
        ? "Payload attitude: roll (orange), pitch (green)"
        : "Output commands: throttle (blue), left brake (orange), right brake (green)",
      x,
      y - 10,
    );
    ctx.strokeStyle = "#38505d";
    ctx.strokeRect(x, y, w, h);
    const start = Math.max(frames[0].t, t - 15),
      chunk = frames.filter((f) => f.t >= start && f.t <= t);
    const series = kind === "attitude" ? 2 : 3;
    for (let k = 0; k < series; k++) {
      ctx.strokeStyle = (
        kind === "attitude"
          ? ["#ffb46a", "#70d8c6"]
          : ["#9ccaff", "#ffb46a", "#70d8c6"]
      )[k];
      ctx.lineWidth = 2;
      ctx.beginPath();
      chunk.forEach((f, i) => {
        const a = att(f),
          v =
            kind === "attitude"
              ? ((k === 0 ? a.x : a.y) * 180) / Math.PI
              : f.command[k] * 100;
        const xx = x + ((f.t - (t - 15)) / 15) * w,
          yy = y + h - ((v - low) / (high - low)) * h;
        i && f.valid ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      });
      ctx.stroke();
    }
    ctx.fillStyle = "#b0c1cc";
    ctx.font = "15px system-ui";
    ctx.fillText(String(high), x + 3, y + 17);
    ctx.fillText(String(low), x + 3, y + h - 5);
    ctx.fillText("Trailing 15 seconds of flight time", x, y + h + 21);
  }
  function draw(t: number, label: string) {
    if (!data) return;
    const f = flightAt(frames, t);
    cursor = t;
    el<HTMLInputElement>("time").value = String(t);
    ctx.fillStyle = "#0b1520";
    ctx.fillRect(0, 0, 1600, 980);
    ctx.fillStyle = "#e5edf4";
    ctx.font = "26px system-ui";
    ctx.fillText(data.title, 24, 36);
    ctx.font = "20px system-ui";
    ctx.fillText(
      `${label} · flight +${((t - frames[0].t) / 60).toFixed(2)} min · ${f.mode} · boot ${t.toFixed(1)} s`,
      24,
      69,
    );
    map(20, 96, 950, 470, f);
    ctx.fillStyle = "#dce9f3";
    ctx.font = "17px system-ui";
    ctx.fillText(
      "3D recorded track · equal spatial scale · no terrain model",
      36,
      124,
    );
    body.position.set(0, 0, 0);
    body.quaternion.copy(orientation(f.q));
    poseMechanisms(
      rig!,
      0,
      [1, 2].map(
        (k) =>
          ((f.command[k] * (f.limits[k][1] - f.limits[k][0]) * Math.PI * 55) /
            360) *
          0.1,
      ),
      [0, 0],
    );
    camera.position.set(-0.65, 0.2, 0.55);
    camera.lookAt(0, 0, 0);
    renderer.setSize(590, 470, false);
    camera.aspect = 590 / 470;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, 990, 96, 590, 470);
    ctx.fillStyle = "#dce9f3";
    ctx.fillText("Recorded payload attitude · canopy not shown", 1006, 124);
    const a = att(f);
    ctx.fillText(
      `Roll ${((a.x * 180) / Math.PI).toFixed(1)}°   Pitch ${((a.y * 180) / Math.PI).toFixed(1)}°`,
      1006,
      541,
    );
    graph(t, 20, 622, 750, 155, "attitude");
    graph(t, 820, 622, 750, 155, "control");
    ctx.font = "20px system-ui";
    ctx.fillStyle = "#dce9f3";
    ctx.fillText(`Height above EKF origin: ${(-f.p[2]).toFixed(1)} m`, 24, 850);
    ctx.fillText(
      `Throttle ${(100 * f.command[0]).toFixed(0)}% · brake command L ${(100 * f.command[1]).toFixed(0)}% / R ${(100 * f.command[2]).toFixed(0)}%`,
      700,
      850,
    );
    ctx.font = "17px system-ui";
    ctx.fillText(
      `PWM: throttle ${f.pwm[0]} · left ${f.pwm[1]} · right ${f.pwm[2]} µs`,
      24,
      889,
    );
    let xx = 24;
    for (const [mode, color] of Object.entries(colors)) {
      ctx.fillStyle = color;
      ctx.fillText(mode, xx, 930);
      xx += 135;
    }
    ctx.fillStyle = "#abbfcb";
    ctx.font = "16px system-ui";
    ctx.fillText(
      "Flight-log replay, not simulation. Servo commands are not measured brake travel. Propeller stationary: RPM unavailable. Current CAD is illustrative.",
      24,
      962,
    );
    if (!f.valid) {
      ctx.fillStyle = "#ff7777";
      ctx.fillText("DATA GAP — do not interpret interpolated motion", 600, 70);
    }
  }
  function schedule() {
    const a = frames[0].t,
      b = frames.at(-1)!.t;
    const base = [
      { start: a, end: b, speed: (b - a) / 45, label: "Full-flight overview" },
    ];
    if (data.source.includes("2026-01-03 15"))
      return [
        ...base,
        {
          start: 755,
          end: 785,
          speed: 1,
          label: "Manual handling and a banked turn",
        },
        {
          start: 625,
          end: 645,
          speed: 1,
          label: "Transition from MANUAL to FBWA",
        },
      ];
    if (data.source.includes("2026-02-15"))
      return [
        ...base,
        {
          start: 635,
          end: 680,
          speed: 1,
          label: "CRUISE · damper disabled at boot 655.79 s",
        },
        { start: 2800, end: 2820, speed: 1, label: "Late AUTO mission" },
      ];
    return base;
  }
  el<HTMLInputElement>("file").onchange = async () => {
    const f = el<HTMLInputElement>("file").files?.[0];
    if (f)
      try {
        load(await f.text());
      } catch (e) {
        el("status").textContent = String(e);
      }
  };
  el("play").onclick = () => {
    playing = !playing;
    el("play").textContent = playing ? "Pause" : "Play";
    last = performance.now();
  };
  el<HTMLInputElement>("time").oninput = () => {
    playing = false;el('play').textContent='Play';
    draw(Number(el<HTMLInputElement>("time").value), "Scrubbing");
  };
  function tick(now: number) {
    if (playing && !recording && data) {
      cursor = Math.min(
        frames.at(-1)!.t,
        cursor +
          ((now - last) / 1000) * Number(el<HTMLSelectElement>("speed").value),
      );
      draw(cursor, `${Number(el<HTMLSelectElement>("speed").value).toFixed(1)}× playback`);
      if (cursor >= frames.at(-1)!.t) cursor = frames[0].t;
    }
    last = now;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  el("record").onclick = () => {
    recording = true;
    playing = false;
    el<HTMLButtonElement>("record").disabled = true;
    const steps = schedule(),
      chunks: Blob[] = [],
      stream = canvas.captureStream(30),
      rec = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 6500000,
      });
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      const a = el<HTMLAnchorElement>("save");
      a.href = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
      a.download = "flight-recap.webm";
      a.hidden = false;
      recording = false;
      el<HTMLButtonElement>("record").disabled = false;
      el("status").textContent = "Video ready";
      stream.getTracks().forEach((x) => x.stop());
    };
    const start = performance.now();
    rec.start();
    function frame(now: number) {
      let elapsed = (now - start) / 1000;
      for (const step of steps) {
        const duration = (step.end - step.start) / step.speed;
        if (elapsed <= duration) {
          draw(
            step.start + elapsed * step.speed,
            `${step.label} · ${step.speed.toFixed(1)}×`,
          );
          el("status").textContent = `Recording · ${step.label}`;
          requestAnimationFrame(frame);
          return;
        }
        elapsed -= duration;
      }
      rec.stop();
    }
    requestAnimationFrame(frame);
  };
  el("overview").onclick = () => {
    draw(frames[0].t, "Flight overview");
    ctx.fillStyle="#0b1520";ctx.fillRect(0,46,1600,42);ctx.fillStyle="#dce9f3";ctx.font="20px system-ui";const manual=frames.filter(f=>f.mode==="MANUAL").length/frames.length;ctx.fillText(`${((frames.at(-1)!.t-frames[0].t)/60).toFixed(1)} minutes · ${(100*manual).toFixed(0)}% MANUAL · white marker: selected flight start · grid: 50 m`,24,72);
    map(20, 96, 1560, 730, frames[0]);
    ctx.fillStyle = "#dce9f3";
    ctx.font = "20px system-ui";
    ctx.fillText(
      "Recorded 3D path · colours show flight mode · height relative to EKF origin · no terrain",
      40,
      131,
    );
    ctx.fillStyle = "#0b1520";
    ctx.fillRect(0, 830, 1600, 150);
    let xx = 30;
    for (const [mode, color] of Object.entries(colors)) {
      ctx.fillStyle = color;
      ctx.fillText(mode, xx, 880);
      xx += 190;
    }
    ctx.fillStyle = "#dce9f3";
    ctx.fillText(
      "Horizontal coordinates are local; vertical and horizontal distances use the same scale.",
      30,
      930,
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = el<HTMLAnchorElement>("image");
      a.href = URL.createObjectURL(blob);
      a.download = "flight-overview.png";
      a.hidden = false;
    }, "image/png");
  };
  const path = new URLSearchParams(location.search).get("recording");
  if (path) {const response=await fetch(path);if(!response.ok)throw Error('Recording unavailable');load(await response.text());
      const chapters=document.createElement('div');el('view').before(chapters);
      for(const step of schedule()) {
        const button=document.createElement('button');button.textContent=step.label;chapters.append(button);
        button.onclick=()=>{cursor=step.start;const speed=el<HTMLSelectElement>('speed');let option=Array.from(speed.options).find(o=>Number(o.value)===step.speed);if(!option){option=new Option(step.speed.toFixed(1),String(step.speed));speed.add(option);}speed.value=String(step.speed);playing=true;el('play').textContent='Pause';last=performance.now();};
      }
      chapters.querySelector('button')!.click();}
}
main().catch((error) => {
  document.getElementById("status")!.textContent = String(error);
});
