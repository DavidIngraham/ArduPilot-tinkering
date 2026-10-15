import {canopyGeometry, canopyMaterial, updateSuspension} from './paraglider';
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
import { flightProfile } from "./profile";
import { rigPayload, poseMechanisms, RotorPhase, phaseAt } from "./mechanisms";

async function main() {
  const selected = new URLSearchParams(location.search).get("case");
  const replayFile =
    selected === "spiral"
      ? "spiral.json"
      : selected === "swoop-soft"
      ? "swoop-soft.json"
      : selected === "swoop-dramatic"
        ? "swoop-dramatic.json"
        : selected === "calm"
          ? "replay-calm.json"
          : selected === "before"
            ? "replay-before.json"
            : "replay.json";
  const response = await fetch("landing/" + replayFile, { cache: "no-store" });
  if (!response.ok) throw Error("Could not load landing replay");
  const data = await response.json();
  const swoop = selected === "spiral" || selected === "swoop-soft" || selected === "swoop-dramatic";
  document.querySelector<HTMLElement>("#swoop-styles")!.hidden = !swoop || selected === "spiral";
  document.querySelector("#case-label")!.textContent =
    data.label ?? "AUTO landing";
  const frames: Frame[] = parseRecording(JSON.stringify(data.frames));
  // Cumulative travel gives a meaningful altitude profile through turns and descending spirals.
  const distanceAlong = flightProfile(frames).map((p) => p.distance);
  const first = frames[0].time_s,
    end = frames.at(-1)!.time_s,
    duration = end - first;
  const flareTime = Number(data.flare_time_s);
  if (!Number.isFinite(flareTime) || flareTime < first || flareTime > end)
    throw Error("Missing recorded flare event");
  const flareOffset = flareTime - first;
  const entry = sample(frames, flareTime);
  const entryGroundSpeed = Math.hypot(entry.state[7], entry.state[8]);
  const target = position(data.target_ned_m);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 1320;
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
  const geo=canopyGeometry();
  const wing=new T.Mesh(geo,canopyMaterial());scene.add(wing);
  if (swoop) {
    const path = new T.BufferGeometry().setFromPoints(
      frames.map((f) => position(f.state.slice(0, 3))),
    );
    scene.add(
      new T.Line(
        path,
        new T.LineBasicMaterial({
          color: 0x70c6ad,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );
  }
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
    last = performance.now();
  const slider = document.querySelector<HTMLInputElement>("#time")!;
  slider.max = String(duration);
  const play = document.querySelector<HTMLButtonElement>("#play")!;
  const startPos = position(frames[0].state.slice(0, 3));
  let previous = startPos.clone();
  camera.position
    .copy(startPos)
    .add(swoop ? new T.Vector3(6, 4, 5) : new T.Vector3(8, 5, 6));
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
    updateSuspension(lines,body,wing);
    renderer.render(scene, camera);
    ctx.fillStyle = "#102330";
    ctx.fillRect(0, 0, 1280, 1320);
    ctx.drawImage(renderer.domElement, 0, 0);
    if (swoop) {
      const north = frames.map((r) => r.state[0]),
        east = frames.map((r) => r.state[1]);
      const n0 = Math.min(...north, data.target_ned_m[0]),
        n1 = Math.max(...north, data.target_ned_m[0]);
      const e0 = Math.min(...east, data.target_ned_m[1]),
        e1 = Math.max(...east, data.target_ned_m[1]);
      const scale = 200 / Math.max(n1 - n0, e1 - e0, 1);
      const mx = (e: number) => 44 + (e - e0) * scale;
      const my = (n: number) => 612 - (n - n0) * scale;
      ctx.fillStyle = "rgba(10,26,36,.88)";
      ctx.fillRect(20, 365, 250, 270);
      ctx.fillStyle = "#edf5ff";
      ctx.font = "17px system-ui";
      ctx.fillText("Ground track · north up", 34, 389);
      ctx.strokeStyle = "#70c6ad";
      ctx.lineWidth = 2;
      ctx.beginPath();
      frames.forEach((r, i) =>
        i
          ? ctx.lineTo(mx(r.state[1]), my(r.state[0]))
          : ctx.moveTo(mx(r.state[1]), my(r.state[0])),
      );
      ctx.stroke();
      ctx.strokeStyle = "#ffba68";
      ctx.beginPath();
      ctx.arc(
        mx(data.target_ned_m[1]),
        my(data.target_ned_m[0]),
        5 * scale,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(mx(f.state[1]), my(f.state[0]), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#edf5ff";
    ctx.font = "22px system-ui";
    const distance = Math.hypot(
      f.state[0] - data.target_ned_m[0],
      f.state[1] - data.target_ned_m[1],
    );
    ctx.fillText(
      (swoop ? "Native AUTO turning landing · " : "Native AUTO landing · ") +
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
    // North-up wind compass: velocity points toward, not meteorological "from".
    // Keep this earth-referenced when the user orbits the aircraft.
    ctx.save();
    ctx.fillStyle = "rgba(10,26,36,.88)";
    ctx.fillRect(1020, 52, 240, 200);
    ctx.translate(1140, 148);
    ctx.strokeStyle = "#68818f";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 49, 0, Math.PI * 2);
    ctx.moveTo(-49, 0);
    ctx.lineTo(49, 0);
    ctx.moveTo(0, -49);
    ctx.lineTo(0, 49);
    ctx.stroke();
    ctx.fillStyle = "#edf5ff";
    ctx.textAlign = "center";
    ctx.font = "16px system-ui";
    ctx.fillText("N", 0, -58);
    ctx.fillText("S", 0, 70);
    ctx.fillText("E", 65, 6);
    ctx.fillText("W", -65, 6);
    const windSpeed = Math.hypot(wind[0], wind[1]);
    if (f.wind_ned_m_s && windSpeed > 0.01) {
      const dx = wind[1] / windSpeed,
        dy = -wind[0] / windSpeed;
      ctx.strokeStyle = ctx.fillStyle = "#7bd9ee";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-dx * 32, -dy * 32);
      ctx.lineTo(dx * 37, dy * 37);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dx * 49, dy * 49);
      ctx.lineTo(dx * 30 - dy * 10, dy * 30 + dx * 10);
      ctx.lineTo(dx * 30 + dy * 10, dy * 30 - dx * 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#edf5ff";
    ctx.font = "17px system-ui";
    ctx.fillText(
      f.wind_ned_m_s
        ? "Wind " + windSpeed.toFixed(1) + " m/s · toward"
        : "Wind unavailable",
      0,
      94,
    );
    ctx.restore();
    const speed = Math.hypot(f.state[7], f.state[8]);
    const flaring = f.time_s >= flareTime;
    ctx.fillStyle = "rgba(10,26,36,.88)";
    ctx.fillRect(20, 52, 655, 88);
    ctx.fillStyle = "#edf5ff";
    ctx.font = "26px system-ui";
    ctx.fillText("Sink ↓ " + f.state[9].toFixed(2) + " m/s", 36, 88);
    ctx.fillText("Ground speed " + speed.toFixed(2) + " m/s", 325, 88);
    ctx.font = "17px system-ui";
    const formatDelta = (value: number) =>
      (value >= 0 ? "+" : "") + value.toFixed(2);
    ctx.fillText(
      flaring
        ? "Since flare: " + formatDelta(f.state[9] - entry.state[9]) + " m/s"
        : "Downward velocity · world frame",
      36,
      120,
    );
    ctx.fillText(
      flaring
        ? "Since flare: " + formatDelta(speed - entryGroundSpeed) + " m/s"
        : "Horizontal velocity · world frame",
      325,
      120,
    );
    ctx.fillStyle = flaring ? "#ffba68" : "#edf5ff";
    ctx.font = "22px system-ui";
    ctx.fillText(
      flaring
        ? "FLARE · " + (f.time_s - flareTime).toFixed(1) + " s"
        : "APPROACH",
      990,
      36,
    );
    // Ordinary replays use north distance; swoops use distance along the recorded track.
    const profileX = frames.map((r, i) =>
      swoop ? distanceAlong[i] : r.state[0],
    );
    const lastFrame = frames.at(-1)!;
    const finalSpeed = Math.max(
      0.01,
      Math.hypot(lastFrame.state[7], lastFrame.state[8]),
    );
    const targetX = swoop
      ? distanceAlong.at(-1)! +
        ((data.target_ned_m[0] - lastFrame.state[0]) * lastFrame.state[7] +
          (data.target_ned_m[1] - lastFrame.state[1]) * lastFrame.state[8]) /
          finalSpeed
      : data.target_ned_m[0];
    const x0 = Math.min(...profileX, targetX),
      x1 = Math.max(...profileX, targetX) + 5;
    const hmax = Math.max(...frames.map((x) => -x.state[2])) + 1;
    const px = (n: number) => 30 + ((n - x0) / (x1 - x0)) * 1200,
      py = (h: number) => 844 - (h / hmax) * 95;
    let index = frames.findIndex((r) => r.time_s >= f.time_s);
    if (index < 0) index = frames.length - 1;
    const prev = Math.max(0, index - 1);
    const fraction =
      index === prev
        ? 0
        : (f.time_s - frames[prev].time_s) /
          (frames[index].time_s - frames[prev].time_s);
    const currentX =
      profileX[prev] + fraction * (profileX[index] - profileX[prev]);
    ctx.strokeStyle = "#749da9";
    ctx.beginPath();
    ctx.moveTo(30, 844);
    ctx.lineTo(1230, 844);
    ctx.stroke();
    ctx.strokeStyle = "#70c6ad";
    ctx.beginPath();
    frames.forEach((r, i) =>
      i
        ? ctx.lineTo(px(profileX[i]), py(-r.state[2]))
        : ctx.moveTo(px(profileX[i]), py(-r.state[2])),
    );
    ctx.stroke();
    ctx.fillStyle = "#ffba68";
    ctx.beginPath();
    ctx.arc(px(targetX), 844, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px(currentX), py(-f.state[2]), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "16px system-ui";
    ctx.fillText(
      swoop
        ? "Height vs distance along flight path · target projected onto final track · first CG ground crossing"
        : "Side profile · height exaggerated for readability · replay ends at first CG ground-plane crossing",
      24,
      880,
    );
    function graph(
      left: number,
      top: number,
      title: string,
      channels: { values: number[]; color: string }[],
      low: number,
      high: number,
      start = first,
      reference?: number,
    ) {
      const width = 550,
        height = 100;
      const x = (stamp: number) =>
        left + ((stamp - start) / (end - start)) * width;
      const y = (value: number) =>
        top + height - ((value - low) / (high - low)) * height;
      ctx.fillStyle = "#edf5ff";
      ctx.font = "17px system-ui";
      ctx.fillText(title, left, top - 18);
      const shade = Math.max(left, x(flareTime));
      ctx.fillStyle = "rgba(255,186,104,.12)";
      ctx.fillRect(shade, top, left + width - shade, height);
      ctx.strokeStyle = "#506b7a";
      ctx.strokeRect(left, top, width, height);
      ctx.font = "14px system-ui";
      ctx.fillStyle = "#b9cfd9";
      ctx.fillText(high.toFixed(1), left - 36, top + 10);
      ctx.fillText(low.toFixed(1), left - 36, top + height);
      if (reference !== undefined) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "#a9b9c4";
        ctx.beginPath();
        ctx.moveTo(left, y(reference));
        ctx.lineTo(left + width, y(reference));
        ctx.stroke();
        ctx.restore();
      }
      for (const channel of channels) {
        ctx.strokeStyle = channel.color;
        ctx.beginPath();
        let began = false;
        frames.forEach((r, i) => {
          if (r.time_s < start) return;
          began
            ? ctx.lineTo(x(r.time_s), y(channel.values[i]))
            : ctx.moveTo(x(r.time_s), y(channel.values[i]));
          began = true;
        });
        ctx.stroke();
      }
      ctx.strokeStyle = "#ffba68";
      ctx.beginPath();
      ctx.moveTo(x(flareTime), top);
      ctx.lineTo(x(flareTime), top + height);
      ctx.stroke();
      if (f.time_s >= start) {
        ctx.strokeStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(x(f.time_s), top);
        ctx.lineTo(x(f.time_s), top + height);
        ctx.stroke();
      }
      ctx.fillStyle = "#b9cfd9";
      ctx.fillText((start - first).toFixed(1) + " s", left, top + 119);
      ctx.fillText(duration.toFixed(1) + " s", left + width - 40, top + 119);
    }
    graph(
      64,
      935,
      "Throttle · %",
      [
        {
          values: frames.map((r) => (r.throttle ?? 0) * 100),
          color: "#f2bd6b",
        },
      ],
      0,
      100,
    );
    graph(
      704,
      935,
      "Brake pull · mm · left cyan / right pink",
      [
        { values: frames.map((r) => r.brake_mm?.[0] ?? 0), color: "#70c6ad" },
        { values: frames.map((r) => r.brake_mm?.[1] ?? 0), color: "#e495b8" },
      ],
      0,
      90,
    );
    const start = Math.max(first, end - 8);
    const sinks = frames.map((r) => r.state[9]),
      speeds = frames.map((r) => Math.hypot(r.state[7], r.state[8]));
    const lower = (values: number[]) =>
      Math.min(0, Math.floor(Math.min(...values) * 2) / 2);
    const upper = (values: number[]) =>
      Math.ceil((Math.max(...values) + 0.1) * 2) / 2;
    graph(
      64,
      1135,
      "Sink rate ↓ · m/s · final 8 s",
      [{ values: sinks, color: "#f2bd6b" }],
      lower(sinks),
      upper(sinks),
      start,
      entry.state[9],
    );
    graph(
      704,
      1135,
      "Ground speed · m/s · final 8 s",
      [{ values: speeds, color: "#70c6ad" }],
      lower(speeds),
      upper(speeds),
      start,
      entryGroundSpeed,
    );
    ctx.fillStyle = "#b9cfd9";
    ctx.font = "17px system-ui";
    ctx.fillText(
      "Orange line / shading: logged flare entry · dashed: speed at entry · white: playback time",
      64,
      1290,
    );
  }
  function loop(now: number) {
    if (playing) {
      const slow =
        document.querySelector<HTMLInputElement>("#slow")!.checked &&
        time >= flareOffset - 1 &&
        time < duration;
      time += Math.min(0.1, (now - last) / 1000) * (slow ? 0.35 : 1);
      if (time > duration + 2) time = 0;
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
  document.querySelector<HTMLButtonElement>("#flare")!.onclick = () => {
    time = Math.max(0, flareOffset - 3);
    playing = true;
    play.textContent = "Pause";
  };
  document.querySelector("#status")!.textContent = "Replay ready";
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
