import "./style.css";
import { MODES } from "./runtime";
import { SimulatorClient } from "./client";
import { FlightView } from "./view";
import { exampleMission, parseMission, offset, type Waypoint } from "./mission";
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const sim = new SimulatorClient();
let ready = false,
  operation = false,
  launched = false,
  uploaded = false,
  items: Waypoint[] = [];
let roll = 0,
  pitch = 0,
  throttle = 0;
const logs: string[] = [];
function log(text: string) {
  logs.push(text);
  if (logs.length > 120) logs.shift();
  el("log").textContent = logs.join("\n");
  el("log").scrollTop = el("log").scrollHeight;
}
function status(text: string) {
  el("status").textContent = text;
}
const view = new FlightView(el("scene"), log);
sim.onLog = log;
sim.onTruth = (frame) => {
  view.updateTruth(frame);
  el("joint-truth").textContent =
    `${frame.time_s.toFixed(1)} s · Canopy / payload joint: ${frame.joint_rotvec_rad.map((v) => ((v * 180) / Math.PI).toFixed(1)).join(" / ")}° · ${(frame.rpm ?? 0).toFixed(0)} rpm`;
};
sim.onError = (text) => {
  ready = false;
  status(text);
  log(text);
  el("connection").textContent = "Simulation stopped";
  buttons();
};
function buttons() {
  for (const id of ["mode", "set-mode", "throttle"])
    (el(id) as HTMLButtonElement).disabled = !ready || operation;
  el<HTMLButtonElement>("launch").disabled = !ready || operation || launched;
  el<HTMLButtonElement>("upload").disabled =
    !ready || operation || !items.length;
  el<HTMLButtonElement>("execute").disabled =
    !ready || operation || !uploaded || !launched;
  el<HTMLButtonElement>("example").disabled = operation;
  el<HTMLInputElement>("mission-file").disabled = operation;
}
async function action(fn: () => Promise<void>) {
  if (operation) return;
  operation = true;
  buttons();
  try {
    await fn();
  } catch (e) {
    const text = e instanceof Error ? e.message : String(e);
    status(text);
    log(text);
  } finally {
    operation = false;
    buttons();
  }
}
function controls() {
  el("knob").style.transform = `translate(${roll * 45}px,${pitch * 45}px)`;
  el<HTMLInputElement>("throttle").value = String(Math.round(throttle * 100));
  el("throttle-value").textContent = `${Math.round(throttle * 100)}%`;
  if (ready) sim.controls(roll, pitch, throttle);
}
sim.onUpdate = () => {
  const s = sim.state;
  view.update(s);
  el("mode-label").textContent =
    Object.keys(MODES).find((n) => MODES[n] === s.mode) ?? String(s.mode);
  el("armed").textContent = s.armed ? "ARMED" : "DISARMED";
  el("alt").textContent = s.alt.toFixed(1);
  el("speed").textContent = s.speed.toFixed(1);
  el("climb").textContent = s.climb.toFixed(1);
  el("heading").textContent =
    `${String(Math.round(((s.yaw * 180) / Math.PI + 360) % 360)).padStart(3, "0")}°`;
  el("mission-current").textContent = uploaded
    ? `ITEM ${s.mission} / ${items.length}`
    : "NO MISSION";
  drawMap();
};
el("launch").onclick = () =>
  void action(async () => {
    status("Arming and preparing airborne control…");
    await sim.launch(el<HTMLSelectElement>("mode").value);
    launched = true;
    throttle = sim.trimThrottle;
    controls();
    status("9-DOF physics released. You have control at 100 m.");
    if (innerWidth <= 720) setDesk(false);
  });
const help: Record<string, string> = {
  MANUAL: "Direct brake and throttle control. Keep enough airspeed to fly.",
  FBWA: "Heading-rate steering with manual throttle.",
  CRUISE:
    "Centered controls hold heading and altitude; pitch requests climb/descent.",
  LOITER: "Circles the current location at the current altitude.",
};
el<HTMLSelectElement>("mode").onchange = () =>
  (el("mode-help").textContent = help[el<HTMLSelectElement>("mode").value]);
el("set-mode").onclick = () =>
  void action(async () => {
    await sim.mode(el<HTMLSelectElement>("mode").value);
    status(`${el<HTMLSelectElement>("mode").value} confirmed by ArduPlane.`);
  });
el<HTMLInputElement>("throttle").oninput = (e) => {
  throttle = Number((e.target as HTMLInputElement).value) / 100;
  controls();
};
const stick = el("stick");
let pointer: number | null = null;
function move(e: PointerEvent) {
  if (e.pointerId !== pointer) return;
  const r = stick.getBoundingClientRect();
  roll = Math.max(
    -1,
    Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width * 0.32)),
  );
  pitch = Math.max(
    -1,
    Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height * 0.32)),
  );
  const length = Math.hypot(roll, pitch);
  if (length > 1) {
    roll /= length;
    pitch /= length;
  }
  controls();
}
stick.onpointerdown = (e) => {
  if (!ready || operation || pointer !== null) return;
  pointer = e.pointerId;
  stick.setPointerCapture(pointer);
  move(e);
};
stick.onpointermove = move;
function release(e?: PointerEvent) {
  if (e && e.pointerId !== pointer) return;
  pointer = null;
  roll = pitch = 0;
  controls();
}
stick.onpointerup = release;
stick.onpointercancel = release;
stick.onlostpointercapture = release;
const keys = new Set<string>();
window.addEventListener("keydown", (e) => {
  if (
    !ready ||
    operation ||
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLSelectElement ||
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "w",
      "s",
      "W",
      "S",
    ].includes(e.key)
  )
    return;
  e.preventDefault();
  keys.add(e.key.toLowerCase());
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
setInterval(() => {
  if (!keys.size || !ready || operation) return;
  roll = (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0);
  pitch = (keys.has("arrowdown") ? 1 : 0) - (keys.has("arrowup") ? 1 : 0);
  throttle = Math.max(
    0,
    Math.min(
      1,
      throttle + (keys.has("w") ? 0.01 : 0) - (keys.has("s") ? 0.01 : 0),
    ),
  );
  controls();
}, 50);
window.addEventListener("keyup", () => {
  if (![...keys].some((k) => k.startsWith("arrow"))) release();
});
function lostFocus() {
  keys.clear();
  release();
}
window.addEventListener("blur", lostFocus);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    lostFocus();
    log(
      "Tab hidden: controls centered. Simulation may pause with browser throttling.",
    );
  }
});
function setMission(next: Waypoint[], label: string) {
  items = next;
  uploaded = false;
  view.mission(items);
  el("mission-info").textContent =
    `${label} · ${items.length} items. Upload before flying.`;
  buttons();
  drawMap();
}
el("example").onclick = () =>
  setMission(exampleMission(), "Trout Lake circuit · 60 m, ends in loiter");
el<HTMLInputElement>("mission-file").onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploaded = false;
  buttons();
  try {
    if (file.size > 1e6) throw Error("Mission file must be smaller than 1 MB.");
    setMission(parseMission(await file.text()), file.name);
  } catch (e) {
    status(String(e));
  } finally {
    (e.target as HTMLInputElement).value = "";
  }
};
el("upload").onclick = () =>
  void action(async () => {
    uploaded = false;
    await sim.upload(items, (n) =>
      status(`Uploading mission item ${n} / ${items.length}…`),
    );
    uploaded = true;
    el("mission-info").textContent =
      `${items.length} items uploaded and accepted by ArduPlane.`;
    status(
      launched
        ? "Mission accepted. Select Fly mission to enter AUTO."
        : "Mission accepted. Start flight, then select Fly mission.",
    );
  });
el("execute").onclick = () =>
  void action(async () => {
    await sim.execute();
    status("AUTO confirmed. ArduPlane is flying the uploaded mission.");
  });
el("reset").onclick = () => location.reload();
el("camera").onclick = () =>
  (el("camera").textContent = `View: ${view.cycle()}`);
el("fullscreen").onclick = () =>
  void (
    document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen()
  ).catch((e) => status(e.message));
function setDesk(open: boolean) {
  el("panel").hidden = !open;
  document.body.classList.toggle("desk-closed", !open);
  el("panel-toggle").setAttribute("aria-expanded", String(open));
}
el("panel-toggle").onclick = () => setDesk(el("panel").hidden);
function drawMap() {
  const canvas = el<HTMLCanvasElement>("map"),
    ctx = canvas.getContext("2d")!;
  const w = canvas.clientWidth || 270,
    h = 135;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  const craft = offset(sim.state.lat, sim.state.lon),
    points = items
      .filter((w) => w.command !== 20)
      .map((w) => offset(w.lat, w.lon));
  const all = [{ east: 0, north: 0 }, craft, ...points];
  const minE = Math.min(...all.map((p) => p.east)) - 40,
    maxE = Math.max(...all.map((p) => p.east)) + 40,
    minN = Math.min(...all.map((p) => p.north)) - 40,
    maxN = Math.max(...all.map((p) => p.north)) + 40;
  const scale = Math.min((w - 28) / (maxE - minE), (h - 24) / (maxN - minN));
  const x = (e: number) => w / 2 + (e - (maxE + minE) / 2) * scale,
    y = (n: number) => h / 2 - (n - (maxN + minN) / 2) * scale;
  ctx.strokeStyle = "#b7ee75";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  points.forEach((p, i) =>
    i ? ctx.lineTo(x(p.east), y(p.north)) : ctx.moveTo(x(p.east), y(p.north)),
  );
  ctx.stroke();
  ctx.font = "9px system-ui";
  points.forEach((p, i) => {
    ctx.fillStyle = "#b7ee75";
    ctx.beginPath();
    ctx.arc(x(p.east), y(p.north), 3, 0, 7);
    ctx.fill();
    ctx.fillText(String(i + 1), x(p.east) + 5, y(p.north) - 4);
  });
  ctx.fillStyle = "#91aeb9";
  ctx.fillText("H", x(0) - 3, y(0) + 3);
  ctx.fillText("N ↑", 9, 15);
  ctx.save();
  ctx.translate(x(craft.east), y(craft.north));
  ctx.rotate(sim.state.yaw);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 5);
  ctx.lineTo(0, 2);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
async function boot() {
  if (!crossOriginIsolated) {
    if (!("serviceWorker" in navigator) || !isSecureContext)
      throw Error(
        "Shared memory requires HTTPS (or localhost) and service workers.",
      );
    status("Enabling shared memory for the simulator…");
    await navigator.serviceWorker.register(
      new URL("simulator-sw.js", document.baseURI),
      { scope: "./" },
    );
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve, reject) => {
        const changed = () => {
          clearTimeout(timer);
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            changed,
          );
          resolve();
        };
        const timer = setTimeout(() => {
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            changed,
          );
          reject(Error("Shared-memory setup timed out. Reload to try again."));
        }, 10000);
        navigator.serviceWorker.addEventListener("controllerchange", changed);
      });
    }
    if (sessionStorage.getItem("microagu-isolation-reload"))
      throw Error(
        "Shared memory is unavailable. Close other site tabs, reload, or try a browser with cross-origin isolation support.",
      );
    sessionStorage.setItem("microagu-isolation-reload", "1");
    location.reload();
    return;
  }
  sessionStorage.removeItem("microagu-isolation-reload");
  status("Starting ArduPlane and initializing sensors…");
  await sim.start();
  ready = true;
  buttons();
  el("connection").textContent = "SITL online";
  status("Ready. Load a mission or launch to begin flying.");
}
drawMap();
void boot().catch((e) => {
  status(e.message);
  log(e.stack ?? e.message);
  el("connection").textContent = "Unable to start";
});
setInterval(() => {
  if (ready && performance.now() - sim.lastReceipt > 5000) {
    el("connection").textContent = "Telemetry delayed";
  } else if (ready) el("connection").textContent = "SITL online";
}, 1000);
