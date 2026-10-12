import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { sample, position, orientation, worldBasis, type Frame } from "./state";
import { rigPayload, poseMechanisms, type Mechanisms } from "./mechanisms";
type Case = {
  amplitude_deg: number;
  profile: string;
  axis: string;
  hinge: number[];
  k: number[];
  c: number[];
  frames: Frame[];
  torques: { spring: number[]; damper: number[] }[];
};
const el = <E extends HTMLElement>(id: string) =>
  document.getElementById(id) as E;
const sel = (id: string) => el<HTMLSelectElement>(id);
async function main() {
  const response = await fetch("joint-tour/responses.json");
  if (!response.ok) throw Error("Could not load response data");
  const data = (await response.json()) as { cases: Case[] };
  const asset = await new GLTFLoader().loadAsync(
    "models/microagu-payload-tl.glb",
  );
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 850;
  el("view").append(canvas);
  const ctx = canvas.getContext("2d")!;
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setSize(1280, 530);
  renderer.setPixelRatio(1);
  // The transparent event surface gives OrbitControls pointer access to the composited view.
  const orbit = new OrbitControls(
    new T.PerspectiveCamera(42, 1280 / 530, 0.01, 100),
    canvas,
  );
  const camera = orbit.object as T.PerspectiveCamera;
  orbit.enablePan = false;
  orbit.minDistance = 1.4;
  orbit.maxDistance = 100;
  orbit.target.set(0, 0.4, 0);
  const scene = new T.Scene();
  scene.background = new T.Color("#142735");
  scene.add(new T.HemisphereLight(0xe6f8ff, 0x566473, 3));
  const sun = new T.DirectionalLight(0xffffff, 3);
  sun.position.set(3, 6, 3);
  scene.add(sun);
  const payload = new T.Group();
  payload.add(asset.scene);
  scene.add(payload);
  const rig: Mechanisms | null = rigPayload(asset.scene);
  const wing = new T.Group();
  scene.add(wing);
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
  wing.add(
    new T.Mesh(
      geo,
      new T.MeshStandardMaterial({
        color: 0x70c6ad,
        side: T.DoubleSide,
        roughness: 0.8,
      }),
    ),
  );
  payload.add(new T.AxesHelper(0.35));
  wing.add(new T.AxesHelper(0.45));
  const ghost = new T.Mesh(
    geo,
    new T.MeshBasicMaterial({
      color: 0xc6d5df,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    }),
  );
  scene.add(ghost);
  const lines = new T.LineSegments(
    new T.BufferGeometry(),
    new T.LineBasicMaterial({ color: 0xa8becb }),
  );
  scene.add(lines);
  const joint = new T.Mesh(
    new T.SphereGeometry(0.018),
    new T.MeshBasicMaterial({ color: 0xffd27a }),
  );
  scene.add(joint);
  const axisArrow = new T.ArrowHelper(
    new T.Vector3(1, 0, 0),
    new T.Vector3(),
    0.65,
    0xffcf64,
    0.08,
    0.035,
  );
  scene.add(axisArrow);
  // All lines must match so wrapping by one grid cell is visually seamless.
  const grid = new T.GridHelper(40, 80, 0x284554, 0x284554);
  grid.position.y = -0.3;
  scene.add(grid);
  let t = 0,
    playing = true,
    last = performance.now(),
    recording = false;
  const names = [
    "North / south",
    "East / west",
    "Up / down",
    "Payload roll",
    "Payload pitch",
    "Payload yaw",
    "Relative roll",
    "Relative pitch",
    "Relative yaw",
  ];
  function options() {
    sel("motion").innerHTML = (
      sel("mode").value === "tour"
        ? names
        : ["Roll release", "Pitch release", "Yaw release"]
    )
      .map((n, i) => `<option value="${i}">${n}</option>`)
      .join("");
    sel("profile").disabled = sel("mode").value === "tour";
    el<HTMLInputElement>("amplitude").disabled = sel("mode").value === "tour";
    t = 0;
    setCamera();
  }
  function setCamera() {
    const v = sel("camera").value;
    camera.up.set(0, 1, 0);
    const offsets: { [key: string]: number[] } = {
      oblique: [1.6, 1, 2.6],
      front: [0, 0.2, -3.6],
      side: [3.6, 0.2, 0],
      top: [0, 3.6, 0.01],
    };
    camera.position
      .copy(orbit.target)
      .add(new T.Vector3(...(offsets[v] as [number, number, number])));
    camera.lookAt(orbit.target);
    orbit.update();
  }
  el<HTMLInputElement>("amplitude").oninput = () => {
    el("amplitude-value").textContent =
      el<HTMLInputElement>("amplitude").value + "°";
    t = 0;
  };
  options();
  sel("mode").onchange = options;
  sel("camera").onchange = setCamera;
  sel("motion").onchange = () => {
    t = 0;
  };
  sel("profile").onchange = () => {
    t = 0;
  };
  el("restart").onclick = () => {
    t = 0;
  };
  el("play").onclick = () => {
    playing = !playing;
    el("play").textContent = playing ? "Pause" : "Play";
  };
  el<HTMLInputElement>("scrub").oninput = () => {
    t = +el<HTMLInputElement>("scrub").value;
    playing = false;
    el("play").textContent = "Play";
  };
  const colors = ["#ff998c", "#91e09e", "#96bdff"];
  function graph(
    x: number,
    title: string,
    values: number[][],
    cursor: number,
    unit: string,
  ) {
    const y = 685,
      w = 375,
      h = 100;
    let range = Math.max(0.001, ...values.flat().map(Math.abs)) * 1.12;
    ctx.fillStyle = "#0d1d29";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#d8e8f2";
    ctx.font = "17px system-ui";
    ctx.fillText(title, x, y - 12);
    ctx.font = "13px system-ui";
    ctx.fillText(`±${range.toPrecision(3)} ${unit}`, x + 4, y + 17);
    ctx.strokeStyle = "#354d5e";
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
    for (let j = 0; j < 3; j++) {
      ctx.strokeStyle = colors[j];
      ctx.beginPath();
      values.forEach((v, i) => {
        const xx = x + (i / (values.length - 1)) * w,
          yy = y + h / 2 - ((v[j] / range) * h) / 2;
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      });
      ctx.stroke();
    }
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x + (w * cursor) / 8, y);
    ctx.lineTo(x + (w * cursor) / 8, y + h);
    ctx.stroke();
    ctx.fillStyle = "#a8c1d1";
    ctx.fillText(
      "0 s                                                 8 s",
      x,
      y + h + 20,
    );
  }
  // Fixed flight-track axes: follow actual cross-track displacement only.
  function reference(c: Case, f: Frame) {
    const base = c.frames[0];
    const hp = new T.Vector3(...(c.hinge as [number, number, number]));
    const lever = hp.clone().applyQuaternion(new T.Quaternion().fromArray(base.state, 3));
    const start = new T.Vector3().fromArray(base.state).add(lever);
    const velocity = new T.Vector3().fromArray(base.state, 7)
      .add(new T.Vector3().fromArray(base.state, 10).cross(lever));
    const nominal = start.clone().addScaledVector(velocity, f.time_s);
    const lateral = new T.Vector3(-velocity.y, velocity.x, 0).normalize();
    const actual = new T.Vector3().fromArray(f.state)
      .add(hp.applyQuaternion(new T.Quaternion().fromArray(f.state, 3)));
    const shift = lateral.multiplyScalar(actual.sub(nominal).dot(lateral));
    return { origin: nominal.clone().add(shift), nominal, shift, start, velocity };
  }
  let framingKey = "";
  function draw() {
    const tour = sel("mode").value === "tour",
      n = +sel("motion").value,
      axis = tour ? Math.max(0, (n - 3) % 3) : n;
    const c = data.cases.find(
      (c) =>
        c.profile === sel("profile").value &&
        c.axis === ["roll", "pitch", "yaw"][axis] &&
        c.amplitude_deg === +el<HTMLInputElement>("amplitude").value,
    )!;
    const base = c.frames[0];
    const key = `${tour}:${c.profile}:${c.axis}:${c.amplitude_deg}:${sel("camera").value}`;
    if (key !== framingKey) {
      framingKey = key;
      orbit.target.set(0, 0.4, 0);
      setCamera();
      if (!tour) {
        const bounds = new T.Box3();
        for (const frame of c.frames) {
          const ref = reference(c, frame).origin;
          for (const offset of [0, 13]) bounds.expandByPoint(position(new T.Vector3().fromArray(frame.state, offset).sub(ref).toArray()));
        }
        bounds.expandByScalar(1.1);
        const sphere = bounds.getBoundingSphere(new T.Sphere());
        const direction = camera.position.clone().sub(orbit.target).normalize();
        orbit.target.copy(sphere.center);
        camera.position.copy(orbit.target).addScaledVector(direction, sphere.radius / Math.sin(T.MathUtils.degToRad(camera.fov / 2)));
        camera.lookAt(orbit.target);
      }
    }
    let f = sample(c.frames, t),
      rp = new T.Quaternion(),
      rc = new T.Quaternion(),
      pp = new T.Vector3(),
      pc = new T.Vector3();
    const hp = new T.Vector3(...(c.hinge as [number, number, number])),
      hc = new T.Vector3(0, 0, 0.85);
    let H = new T.Vector3();
    const ghostOffset = new T.Vector3();
    let nominalSpeed = 0;
    grid.position.set(0, -0.3, 0);
    const unit = new T.Vector3().setComponent(tour && n < 3 ? n : axis, 1);
    if (tour) {
      const amp = Math.sin((t / 8) * Math.PI * 2);
      if (n < 3) H.copy(unit).multiplyScalar(0.28 * amp);
      if (n >= 3 && n < 6) rp.setFromAxisAngle(unit, 0.22 * amp);
      rc.copy(rp);
      if (n >= 6)
        rc.multiply(new T.Quaternion().setFromAxisAngle(unit, 0.25 * amp));
      pp.copy(H).sub(hp.clone().applyQuaternion(rp));
      pc.copy(H).sub(hc.clone().applyQuaternion(rc));
    } else {
      rp.fromArray(f.state, 3);
      rc.fromArray(f.state, 16);
      const tracking = reference(c, f);
      const origin = tracking.origin;
      ghostOffset.copy(tracking.shift).negate();
      nominalSpeed = tracking.velocity.length();
      const travel = position(origin.clone().sub(tracking.start).toArray());
      // Grid includes lateral camera travel, retaining cross-track optical flow.
      grid.position.x = -((travel.x % 0.5 + 0.5) % 0.5);
      grid.position.z = -((travel.z % 0.5 + 0.5) % 0.5);
      pp.fromArray(f.state).sub(origin);
      pc.fromArray(f.state, 13).sub(origin);
      H.copy(pp).add(hp.clone().applyQuaternion(rp));
    }
    payload.position.copy(position(pp.toArray()));
    payload.quaternion.copy(worldBasis).multiply(rp);
    wing.position.copy(position(pc.toArray()));
    wing.quaternion.copy(worldBasis).multiply(rc);
    joint.position.copy(position(H.toArray()));
    const gq = tour
      ? n < 6
        ? rc
        : rp
      : new T.Quaternion().fromArray(base.state, 16);
    ghost.quaternion.copy(worldBasis).multiply(gq);
    ghost.position.copy(
      position((tour ? H.clone() : ghostOffset).sub(hc.clone().applyQuaternion(gq)).toArray()),
    );
    axisArrow.setDirection(
      position(
        unit
          .clone()
          .applyQuaternion(tour && n < 3 ? new T.Quaternion() : rp)
          .toArray(),
      ).normalize(),
    );
    axisArrow.position.copy(joint.position);
    axisArrow.visible = tour;
    const points = [-0.0743, 0.0743].flatMap((y) => {
      const attach = pp
        .clone()
        .add(new T.Vector3(hp.x, y, hp.z).applyQuaternion(rp));
      return [
        position(attach.toArray()),
        position(
          pc
            .clone()
            .add(
              new T.Vector3(0, Math.sign(y) * 0.75, 0.15).applyQuaternion(rc),
            )
            .toArray(),
        ),
      ];
    });
    lines.geometry.dispose();
    lines.geometry = new T.BufferGeometry().setFromPoints(points);
    let rotorPhase = 0;
    for (let i = 1; i < c.frames.length && c.frames[i - 1].time_s < t; i++) {
      const a = c.frames[i - 1],
        b = c.frames[i];
      rotorPhase +=
        (((Math.min(t, b.time_s) - a.time_s) *
          ((a.rpm ?? 0) + (b.rpm ?? 0)) *
          0.5) /
          60) *
        Math.PI *
        2;
    }
    if (rig) poseMechanisms(rig, rotorPhase, f.brake_mm, base.brake_mm);
    orbit.update();
    renderer.render(scene, camera);
    ctx.fillStyle = "#10202c";
    ctx.fillRect(0, 0, 1280, 850);
    ctx.drawImage(renderer.domElement, 0, 60);
    ctx.fillStyle = "#edf5fc";
    ctx.font = "25px system-ui";
    ctx.fillText(
      tour
        ? `${n + 1} / 9 · ${names[n]}`
        : `${["Roll", "Pitch", "Yaw"][n]} deflection release · ${c.profile.replace("_", " ")}`,
      22,
      35,
    );
    ctx.font = "17px system-ui";
    ctx.fillStyle = "#b9d0de";
    ctx.fillText(
      tour
        ? "Prescribed motion · not a physics response"
        : `Actual simulator · +${c.amplitude_deg}° initial deflection · trim speed ${nominalSpeed.toFixed(1)} m/s · ${t.toFixed(2)} s`,
      22,
      615,
    );
    el("description").textContent = tour
      ? "The selected coordinate is animated while the others are held fixed. Yellow marks its axis. This is a kinematic illustration; no spring response is implied."
      : `Release from a +${c.amplitude_deg}° relative deflection about the selected payload axis. Each slider step selects a separately simulated response, not an amplified animation. All axes are free to respond. The camera follows nominal forward motion and actual lateral drift. Fore–aft and vertical disturbance motion remain visible. The gray canopy marks nominal flight. The scrolling 0.5 m reference grid conveys horizontal speed; it is not terrain or an altitude cue. Curves show eight seconds; white marks playback time.`;
    if (!tour) {
      graph(
        22,
        "Rotation change from release",
        c.frames.map((f) =>
          f.joint_rotvec_rad.map(
            (v, j) => ((v - base.joint_rotvec_rad[j]) * 180) / Math.PI,
          ),
        ),
        t,
        "deg",
      );
      graph(
        450,
        "Relative angular velocity",
        c.frames.map((f) => f.joint_rate_rad_s.map((v) => (v * 180) / Math.PI)),
        t,
        "deg/s",
      );
      graph(
        878,
        "Canopy joint torque: spring + damper",
        c.torques.map((v) => v.spring.map((x, i) => x + v.damper[i])),
        t,
        "N m",
      );
    } else {
      ctx.font = "22px system-ui";
      ctx.fillStyle = "#ffcf64";
      ctx.fillText(
        n < 3
          ? "3 independent translations of the shared attachment"
          : n < 6
            ? "3 payload rotations relative to the world"
            : "3 canopy rotations relative to the payload",
        25,
        680,
      );
      ctx.fillStyle = "#ccdce6";
      ctx.font = "19px system-ui";
      ctx.fillText(
        "Point constraint: attachments coincide. Rotational spring and damping torques do not remove a DOF.",
        25,
        730,
      );
    }
    if (!tour) {
      const q = c.torques[Math.min(c.torques.length - 1, Math.round(t / 0.05))];
      ctx.fillStyle = "#d5e4ed";
      ctx.font = "14px system-ui";
      ctx.fillText(
        "Spring [roll, pitch, yaw] " +
          q.spring.map((v) => v.toFixed(4)).join(", ") +
          " N m   |   Damper " +
          q.damper.map((v) => v.toFixed(4)).join(", ") +
          " N m",
        22,
        640,
      );
    }
    ctx.font = "16px system-ui";
    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillText(
        ["Roll / forward axis", "Pitch / right axis", "Yaw / down axis"][i],
        25 + i * 245,
        837,
      );
    });
    el<HTMLInputElement>("scrub").value = String(t);
  }
  function loop(now: number) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
      t += dt * +sel("speed").value;
      if (t > 8) {
        t = 0;
        if (el<HTMLInputElement>("advance").checked)
          sel("motion").selectedIndex =
            (sel("motion").selectedIndex + 1) % sel("motion").options.length;
      }
    }
    draw();
  }
  // A worker clock keeps the capture running when the app panel is not foreground.
  const ticker = new Worker(
    URL.createObjectURL(
      new Blob(["setInterval(()=>postMessage(0),33)"], {
        type: "text/javascript",
      }),
    ),
  );
  ticker.onmessage = () => loop(performance.now());
  el("record").onclick = () => {
    if (recording) return;
    recording = true;
    sel("mode").value = "tour";
    options();
    playing = true;
    t = 0;
    sel("speed").value = "1";
    el<HTMLInputElement>("advance").checked = true;
    sel("camera").value = "oblique";
    setCamera();
    const chunks: BlobPart[] = [];
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 4500000,
    });
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      const a = el<HTMLAnchorElement>("save");
      a.href = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
      a.hidden = false;
      recording = false;
      stream.getTracks().forEach((t) => t.stop());
    };
    rec.start();
    setTimeout(() => {
      sel("mode").value = "response";
      options();
    }, 72000);
    setTimeout(() => rec.stop(), 96000);
  };
}
main().catch((e) => {
  el("error").textContent = String(e);
});
