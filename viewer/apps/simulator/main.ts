import { ensureIsolation } from "@microagu/sim-browser/session/isolation";
import { joystick } from "@microagu/applet-ui/controls/joystick";
import { registerApplet } from "@microagu/applet-ui/shell/mount";
import {
  ManagedRenderer,
  ManagedScene,
} from "@microagu/rendering/scene/resources";
import { ModelAssets } from "@microagu/rendering/assets/models";
import { TruthBuffer } from "@microagu/playback/live-buffer";
import { truthPose } from "@microagu/playback/pose";
import { HOME, exampleMission } from "./missions/default";
const offset = (lat: number, lon: number) => homeOffset(lat, lon, HOME);
import { definition } from "./definition";
import "./styles.css";
import { MODES } from "@microagu/contracts/telemetry";
import { SimulatorClient } from "@microagu/sim-browser/worker/client";
import { FlightView } from "@microagu/rendering/scene/flight-view";
import {
  parseMission,
  offset as homeOffset,
  type Waypoint,
} from "@microagu/contracts/mission";
export const applet = registerApplet(definition, async (scope) => {
  const assets = scope.own(new ModelAssets(scope.signal));

  const el = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T;

  const sim = scope.own(new SimulatorClient(HOME, document.baseURI));

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

  const view = scope.own(new FlightView(el("scene"), log));
  const truth = new TruthBuffer();
  let lastPresentation = performance.now();
  function present(now: number) {
    const dt = Math.min(0.1, Math.max(0, (now - lastPresentation) / 1000));
    lastPresentation = now;
    const frame = truth.advance(dt);
    if (frame) view.render(truthPose(frame), dt);
    scope.requestFrame(present);
  }
  scope.requestFrame(present);

  sim.onLog = log;

  sim.onTruth = (frame) => {
    truth.push(frame, performance.now() / 1000);
    const phase = [
      "Ground hold",
      "Assisted inflation",
      "Free flight",
      "Ground contact",
    ][frame.launch_phase ?? 2];
    el("joint-truth").textContent =
      `${phase} · ${Math.round((frame.inflation ?? 1) * 100)}% inflation · ${frame.time_s.toFixed(1)} s · Canopy / payload joint: ${frame.joint_rotvec_rad.map((v) => ((v * 180) / Math.PI).toFixed(1)).join(" / ")}° · ${(frame.rpm ?? 0).toFixed(0)} rpm`;
  };

  sim.onError = (text) => {
    ready = false;
    status(text);
    log(text);
    el("connection").textContent = "Simulation stopped";
    buttons();
  };

  function buttons() {
    for (const id of ["mode", "set-mode", "throttle", "apply-wind"])
      (el(id) as HTMLButtonElement).disabled = !ready || operation;
    el<HTMLButtonElement>("launch").disabled = !ready || operation || launched;
    el("launch").textContent = launched
      ? "Flight running"
      : "Inflate and launch";
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
      if (scope.disposed) return;
      const text = e instanceof Error ? e.message : String(e);
      status(text);
      log(text);
    } finally {
      operation = false;
      if (!scope.disposed) buttons();
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

  scope.property(
    el("launch"),
    "onclick",
    () =>
      void action(async () => {
        status("Arming and preparing assisted launch…");
        await sim.launch(el<HTMLSelectElement>("mode").value);
        launched = true;
        throttle = sim.trimThrottle;
        controls();
        status("Inflating and launching. Flight controls are active.");
        if (innerWidth <= 720) setDesk(false);
      }),
  );

  const help: Record<string, string> = {
    MANUAL: "Direct brake and throttle control. Keep enough airspeed to fly.",
    FBWA: "Heading-rate steering with manual throttle.",
    CRUISE:
      "Centered controls hold heading and altitude; pitch requests climb/descent.",
    LOITER: "Circles the current location at the current altitude.",
  };

  scope.property(
    el<HTMLSelectElement>("mode"),
    "onchange",
    () =>
      (el("mode-help").textContent = help[el<HTMLSelectElement>("mode").value]),
  );

  scope.property(
    el("set-mode"),
    "onclick",
    () =>
      void action(async () => {
        await sim.mode(el<HTMLSelectElement>("mode").value);
        status(
          `${el<HTMLSelectElement>("mode").value} confirmed by ArduPlane.`,
        );
      }),
  );

  scope.property(el<HTMLInputElement>("throttle"), "oninput", (e) => {
    throttle = Number((e.target as HTMLInputElement).value) / 100;
    controls();
  });

  const windValues = () =>
    ["wind-speed", "wind-direction", "wind-up"].map((id) =>
      Number(el<HTMLInputElement>(id).value),
    );

  function windLabels() {
    const [speed, bearing, up] = windValues();
    el("wind-speed-value").textContent = `${speed.toFixed(1)} m/s`;
    el("wind-direction-value").textContent =
      `${bearing}° · ${["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(bearing / 45) % 8]}`;
    el("wind-up-value").textContent =
      `${up > 0 ? "+" : ""}${up.toFixed(1)} m/s`;
  }

  for (const id of ["wind-speed", "wind-direction", "wind-up"])
    scope.property(el(id), "oninput", windLabels);

  scope.property(
    el("apply-wind"),
    "onclick",
    () =>
      void action(async () => {
        const [speed, bearing, up] = windValues();
        await sim.wind(speed, bearing, up);
        el("wind-status").textContent =
          speed === 0 && up === 0
            ? "Calm"
            : `Applied: ${speed.toFixed(1)} m/s from ${bearing}°, vertical ${up.toFixed(1)} m/s`;
      }),
  );

  const stick = joystick(
    scope,
    el("stick"),
    () => ready && !operation,
    (x, y) => {
      roll = x;
      pitch = y;
      controls();
    },
  );
  const release = () => stick.reset();
  const keys = new Set<string>();

  scope.listen(window, "keydown", (e) => {
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

  scope.listen(window, "keyup", (e) => keys.delete(e.key.toLowerCase()));

  scope.interval(() => {
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

  scope.listen(window, "keyup", () => {
    if (![...keys].some((k) => k.startsWith("arrow"))) release();
  });

  function lostFocus() {
    keys.clear();
    release();
  }

  scope.listen(window, "blur", lostFocus);

  scope.listen(document, "visibilitychange", () => {
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
    view.routePoints(
      items
        .filter((w) => w.command !== 20)
        .map((w) => {
          const p = offset(w.lat, w.lon);
          return [p.north, p.east, -(w.frame === 3 ? w.alt : w.alt - HOME.alt)];
        }),
    );
    el("mission-info").textContent =
      `${label} · ${items.length} items. Upload before flying.`;
    buttons();
    drawMap();
  }

  scope.property(el("example"), "onclick", () =>
    setMission(exampleMission(), "Trout Lake circuit · 60 m, ends in loiter"),
  );

  scope.property(
    el<HTMLInputElement>("mission-file"),
    "onchange",
    async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      uploaded = false;
      buttons();
      try {
        if (file.size > 1e6)
          throw Error("Mission file must be smaller than 1 MB.");
        setMission(parseMission(await file.text()), file.name);
      } catch (e) {
        status(String(e));
      } finally {
        (e.target as HTMLInputElement).value = "";
      }
    },
  );

  scope.property(
    el("upload"),
    "onclick",
    () =>
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
      }),
  );

  scope.property(
    el("execute"),
    "onclick",
    () =>
      void action(async () => {
        await sim.execute();
        status("AUTO confirmed. ArduPlane is flying the uploaded mission.");
      }),
  );

  scope.property(el("reset"), "onclick", () => void applet.mount().catch(log));

  scope.property(
    el("camera"),
    "onclick",
    () => (el("camera").textContent = `View: ${view.cycle()}`),
  );

  scope.property(
    el("fullscreen"),
    "onclick",
    () =>
      void (
        document.fullscreenElement
          ? document.exitFullscreen()
          : document.documentElement.requestFullscreen()
      ).catch((e) => status(e.message)),
  );

  function setDesk(open: boolean) {
    el("panel").hidden = !open;
    document.body.classList.toggle("desk-closed", !open);
    el("panel-toggle").setAttribute("aria-expanded", String(open));
  }

  scope.property(el("panel-toggle"), "onclick", () =>
    setDesk(el("panel").hidden),
  );

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
    if (!crossOriginIsolated)
      status("Enabling shared memory for the simulator…");
    if (!(await ensureIsolation(document.baseURI, scope.signal))) return;
    status("Starting ArduPlane and initializing sensors…");
    operation = true;
    buttons();
    await sim.start();
    operation = false;
    ready = true;
    buttons();
    el("connection").textContent = "SITL online";
    await action(async () => {
      setMission(exampleMission(), "Trout Lake circuit · 60 m, ends in loiter");
      status("Uploading the default mission…");
      await sim.upload(items, (n) =>
        status(`Uploading mission item ${n} / ${items.length}…`),
      );
      uploaded = true;
      el("mission-info").textContent =
        `${items.length} items uploaded and accepted by ArduPlane.`;
      status("Starting the default AUTO mission…");
      await sim.launch("AUTO");
      launched = true;
      throttle = sim.trimThrottle;
      controls();
      await sim.execute();
      status(
        "AUTO confirmed. Flying the default circuit. Engage another mode to take over.",
      );
      if (innerWidth <= 720) setDesk(false);
    });
  }

  drawMap();

  void boot().catch((e) => {
    if (scope.disposed) return;
    status(e.message);
    log(e.stack ?? e.message);
    el("connection").textContent = "Unable to start";
  });

  scope.interval(() => {
    if (ready && performance.now() - sim.lastReceipt > 5000) {
      el("connection").textContent = "Telemetry delayed";
    } else if (ready) el("connection").textContent = "SITL online";
  }, 1000);
});
