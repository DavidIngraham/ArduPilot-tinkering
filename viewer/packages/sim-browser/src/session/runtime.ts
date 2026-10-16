import { RuntimeAssets } from "../assets/runtime";
import { delay } from "./delay";
import { altitudeLever, pilotChannels } from "./pilot-input";
import {
  MAVLink,
  type Message,
  type Values,
} from "@microagu/sim-browser/ardupilot/mavlink";
import { type Home, type Waypoint } from "@microagu/contracts/mission";
import {
  Physics,
  type PhysicsConfig,
} from "@microagu/sim-browser/physics/physics";
import type { Frame } from "@microagu/contracts/recordings";
import {
  MODES,
  initialTelemetry,
  type Telemetry,
} from "@microagu/contracts/telemetry";
export class Simulator {
  private lifetime = new AbortController();
  private started = false;
  private disposed = false;
  dispose(reason: unknown = Error("Simulator disposed")) {
    if (this.disposed) return;
    this.disposed = true;
    this.stopped = true;
    this.lifetime.abort(reason);
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.listeners.clear();
    this.physics?.dispose();
    // Emscripten installs throwing getters for unexported runtime names.
    const pthread =
      this.module &&
      Object.getOwnPropertyDescriptor(this.module, "PThread")?.value;
    pthread?.terminateAllThreads();
  }
  constructor(readonly home: Home) {
    this.state = initialTelemetry(home);
  }
  state: Telemetry;
  onUpdate = () => {};
  onLog = (text: string) => {};
  onTruth = (frame: Frame) => {};
  onError = (text: string) => {};
  physics!: Physics;
  private jsonRead!: (ptr: number, length: number) => number;
  private jsonWrite!: (frame: number, ptr: number, length: number) => number;
  private jsonRx = 0;
  private jsonTx = 0;
  private lastTruth = 0;
  private stopped = false;
  private mav = new MAVLink();
  private module: any;
  private read!: (port: number, ptr: number, length: number) => number;
  private write!: (port: number, ptr: number, length: number) => number;
  private rx = 0;
  private tx = 0;
  private listeners = new Set<(m: Message) => void>();
  private queue: Uint8Array[] = [];
  private timers: ReturnType<typeof setInterval>[] = [];
  private channels = [1500, 1500, 1000, 1500, 1500, 1500, 1000, 1800];
  private busy = false;
  private lastStatus = "";
  async start(
    url: string,
    config?: PhysicsConfig,
    physicsBase = new URL(".", url).href,
  ) {
    if (this.started) throw Error("Session already started");
    this.started = true;
    this.lifetime.signal.throwIfAborted();
    if (!crossOriginIsolated)
      throw Error(
        "This browser has not enabled shared memory. Reload once after the simulator service worker activates, or use a browser supporting cross-origin isolation.",
      );
    this.physics = await Physics.load(physicsBase, config);
    this.physics.groundStart(true);
    const assets = url.startsWith("file:")
      ? null
      : await RuntimeAssets.load(new URL(".", url).href);
    if (assets) {
      await assets.bytes("arduplane.js");
      url = assets.url("arduplane.js");
    }
    const wasmBinary = assets
      ? await assets.bytes("arduplane.wasm")
      : undefined;
    this.lifetime.signal.throwIfAborted();
    const { default: create } = await import(/* @vite-ignore */ url);
    const defaults =
      this.physics.config.defaults +
      `\nFLTMODE_CH 0\nLOG_DISARMED 0\nLOG_BACKEND_TYPE 0\nFS_GCS_ENABL 0\nFS_LONG_ACTN 0\nRC_OVERRIDE_TIME 1\nSIM_SPEEDUP 1\nSTICK_MIXING 4\nFBWB_ELEV_REV 0\n`;
    this.module = await create({
      ...(wasmBinary ? { wasmBinary } : {}),
      arguments: [
        "--model",
        "JSON:wasm",
        "--rate",
        "200",
        "--home",
        `${this.home.lat},${this.home.lon},${this.home.alt},0`,
        "--serial0",
        "wasm",
        "--serial1",
        "none",
        "--serial2",
        "none",
        "--defaults",
        "@ROMFS/default_params/paraglider.parm,/browser.parm",
        "--wipe",
      ],
      ...(url.startsWith("file:")
        ? {}
        : {
            locateFile: (name: string) =>
              assets?.url(name) ?? new URL(name, url).href,
            mainScriptUrlOrBlob: url,
          }),
      preRun: [(m: any) => m.FS.writeFile("/browser.parm", defaults)],
      print: (s: string) => this.onLog(s),
      printErr: (s: string) => this.onLog(s),
    });
    const wrap = this.module.cwrap;
    const malloc = wrap("ardupilot_malloc", "number", ["number"]);
    this.rx = malloc(8192);
    this.tx = malloc(8192);
    this.jsonRx = malloc(72);
    this.jsonTx = malloc(8192);
    this.jsonRead = wrap("ardupilot_json_read", "number", ["number", "number"]);
    this.jsonWrite = wrap("ardupilot_json_write", "number", [
      "number",
      "number",
      "number",
    ]);
    this.read = wrap("ardupilot_serial_read", "number", [
      "number",
      "number",
      "number",
    ]);
    this.write = wrap("ardupilot_serial_write", "number", [
      "number",
      "number",
      "number",
    ]);
    const phase = wrap("ardupilot_json_phase", "number", [])();
    const waitAsync = (Atomics as any).waitAsync;
    const run = async () => {
      try {
        while (!this.stopped) {
          this.poll();
          const memory = new Int32Array(this.module.HEAPU8.buffer);
          const value = Atomics.load(memory, phase / 4);
          // The firmware wakes us when a new servo frame is published. The
          // short timeout also services UARTs while the FDM is not running.
          if (waitAsync) {
            if (value !== 1)
              await waitAsync(memory, phase / 4, value, 10).value;
          } else await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } catch (e) {
        this.dispose(e);
        this.onError(e instanceof Error ? e.message : String(e));
      }
    };
    void run();
    this.timers.push(
      setInterval(
        () =>
          this.send("HEARTBEAT", {
            type: 6,
            autopilot: 8,
            base_mode: 0,
            system_status: 4,
            mavlink_version: 3,
          }),
        1000,
      ),
    );
    this.timers.push(setInterval(() => this.sendRC(), 50));
    await this.wait(
      (m) =>
        m.name === "HEARTBEAT" &&
        [3, 4].includes(Number(m.values.system_status)),
      45000,
    );
    for (const [id, hz] of [
      [30, 20],
      [33, 10],
      [36, 10],
      [74, 5],
      [42, 2],
      [193, 2],
      [62, 5],
    ])
      await this.command(511, [id, 1e6 / hz]);
    await this.wait(
      (m) =>
        m.name === "EKF_STATUS_REPORT" && (Number(m.values.flags) & 19) === 19,
      45000,
    );
  }
  private poll() {
    const bytes = this.jsonRead(this.jsonRx, 72);
    if (bytes) {
      const packet = this.module.HEAPU8.slice(this.jsonRx, this.jsonRx + bytes);
      const frame = new DataView(packet.buffer).getUint32(4, true);
      const sensors = new TextEncoder().encode(this.physics.respond(packet));
      if (sensors.length > 8192)
        throw Error("Physics sensor packet is too large");
      this.module.HEAPU8.set(sensors, this.jsonTx);
      if (this.jsonWrite(frame, this.jsonTx, sensors.length) !== sensors.length)
        throw Error("SITL rejected the lockstep physics frame");
      if (performance.now() - this.lastTruth >= 40) {
        this.lastTruth = performance.now();
        this.onTruth(this.physics.truth());
      }
    }
    for (let i = 0; i < 16; i++) {
      const count = this.read(0, this.rx, 8192);
      if (!count) break;
      for (const m of this.mav.feed(
        this.module.HEAPU8.slice(this.rx, this.rx + count),
      )) {
        if (m.system !== 1 || m.component !== 1) continue;
        const v = m.values as Record<string, number>;
        switch (m.name) {
          case "HEARTBEAT":
            this.state.mode = v.custom_mode;
            this.state.armed = !!(v.base_mode & 128);
            this.state.lastHeartbeat = performance.now();
            break;
          case "ATTITUDE":
            Object.assign(this.state, {
              roll: v.roll,
              pitch: v.pitch,
              yaw: v.yaw,
            });
            break;
          case "GLOBAL_POSITION_INT":
            Object.assign(this.state, {
              lat: v.lat / 1e7,
              lon: v.lon / 1e7,
              alt: v.relative_alt / 1000,
            });
            break;
          case "NAV_CONTROLLER_OUTPUT":
            this.state.targetAlt = this.state.alt + v.alt_error;
            this.state.targetRoll = v.nav_roll;
            break;
          case "VFR_HUD":
            Object.assign(this.state, { speed: v.groundspeed, climb: v.climb });
            break;
          case "SERVO_OUTPUT_RAW":
            if (v.port === 0)
              this.state.servos = [v.servo1_raw, v.servo2_raw, v.servo3_raw];
            break;
          case "MISSION_CURRENT":
            this.state.mission = v.seq;
            break;
          case "STATUSTEXT":
            this.lastStatus = String(m.values.text);
            this.onLog(this.lastStatus);
            break;
        }
        for (const listener of this.listeners) listener(m);
        this.onUpdate();
      }
    }
    while (this.queue.length) {
      const bytes = this.queue[0];
      this.module.HEAPU8.set(bytes, this.tx);
      const sent = this.write(0, this.tx, bytes.length);
      if (sent === bytes.length) this.queue.shift();
      else {
        this.queue[0] = bytes.slice(sent);
        break;
      }
    }
  }
  send(name: string, values: Values = {}) {
    if (this.queue.length > 200)
      throw Error("Simulator serial link is stalled. Reset the simulator.");
    this.queue.push(
      this.mav.encode(name, {
        target_system: 1,
        target_component: 1,
        ...values,
      }),
    );
  }
  private wait(predicate: (m: Message) => boolean, timeout = 5000) {
    return new Promise<Message>((resolve, reject) => {
      this.lifetime.signal.throwIfAborted();
      const cleanup = () => {
        clearTimeout(timer);
        this.listeners.delete(listener);
        this.lifetime.signal.removeEventListener("abort", abort);
      };
      const abort = () => {
        cleanup();
        reject(this.lifetime.signal.reason);
      };
      const listener = (m: Message) => {
        if (predicate(m)) {
          cleanup();
          resolve(m);
        }
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(Error("Timed out waiting for ArduPlane. Check the event log."));
      }, timeout);
      this.listeners.add(listener);
      this.lifetime.signal.addEventListener("abort", abort, { once: true });
    });
  }
  async command(command: number, params: number[] = []) {
    const reply = this.wait(
      (m) => m.name === "COMMAND_ACK" && m.values.command === command,
    );
    this.send("COMMAND_LONG", {
      command,
      confirmation: 0,
      ...Object.fromEntries(
        Array.from({ length: 7 }, (_, i) => [`param${i + 1}`, params[i] ?? 0]),
      ),
    });
    const result = Number((await reply).values.result);
    if (result !== 0)
      throw Error(
        `ArduPlane rejected command ${command} (result ${result}). ${this.lastStatus}`,
      );
  }
  async mode(name: string) {
    const mode = MODES[name];
    if (mode === undefined) throw Error("Unknown mode");
    if (this.state.mode === mode) return;
    // Never carry a manual brake pull or climb command across a mode switch.
    this.channels[0] = this.channels[1] = 1500;
    this.sendRC();
    const confirmed = this.wait(
      (m) => m.name === "HEARTBEAT" && m.values.custom_mode === mode,
    );
    this.send("SET_MODE", { base_mode: 1, custom_mode: mode });
    await confirmed;
  }
  controls(roll: number, pitch: number, throttle: number) {
    const channels = pilotChannels(
      this.state.mode,
      roll,
      pitch,
      throttle,
      this.physics.config.command[0],
    );
    this.channels.splice(0, 3, ...channels);
  }
  async altitude(metres: number) {
    if (!Number.isFinite(metres) || metres < 5 || metres > 300)
      throw Error("Altitude must be 5–300 m above home.");
    if (
      ![MODES.FBWB, MODES.CRUISE, MODES.AUTO, MODES.LOITER].includes(
        this.state.mode,
      )
    )
      throw Error("Select FBWB, CRUISE, AUTO or LOITER to command altitude.");
    if (altitudeLever(this.state.mode)) {
      // AP locks current height on stick release. Let that transition finish
      // before installing a numeric target, or it can overwrite the command.
      this.channels[1] = 1500;
      this.sendRC();
      await delay(250, this.lifetime.signal);
    }
    const reply = this.wait(
      (m) => m.name === "COMMAND_ACK" && m.values.command === 186,
    );
    this.send("COMMAND_INT", {
      command: 186,
      frame: 3,
      param1: metres,
      param2: 3,
      current: 0,
      autocontinue: 0,
    });
    const result = Number((await reply).values.result);
    if (result !== 0)
      throw Error(`ArduPlane rejected altitude command (${result}).`);
    // Verify the controller demand, rather than treating an ACK as a climb.
    await this.wait(
      (m) =>
        m.name === "NAV_CONTROLLER_OUTPUT" &&
        Math.abs(this.state.alt + Number(m.values.alt_error) - metres) < 1,
      8000,
    );
  }
  private sendRC() {
    this.send(
      "RC_CHANNELS_OVERRIDE",
      Object.fromEntries(this.channels.map((v, i) => [`chan${i + 1}_raw`, v])),
    );
  }
  async launch(mode = "CRUISE") {
    await this.mode("MANUAL");
    await this.command(400, [1]);
    // Arming an airborne model moves home. Restore the ground reference before
    // initializing the height demand, matching the native research harness.
    const home = this.wait(
      (m) =>
        m.name === "HOME_POSITION" &&
        Math.abs(Number(m.values.altitude) / 1000 - this.home.alt) < 0.1,
    );
    await this.command(179, [
      0,
      0,
      0,
      0,
      this.home.lat,
      this.home.lon,
      this.home.alt,
    ]);
    await this.command(512, [242]);
    await home;
    // A waypoint-only AUTO mission suppresses throttle while on the ground.
    // The assisted launch uses the normal FBWA RC/throttle path, then hands over.
    this.controls(0, 0, 0);
    this.sendRC();
    await delay(1000, this.lifetime.signal);
    this.physics.released = true;
    while (!this.physics.powerReady) await delay(50, this.lifetime.signal);
    // Do not let stabilization pull a brake while the operator holds the
    // carriage inverted. Engage it only after upright release and the glide.
    await this.mode("FBWA");
    this.controls(0, 0, 0.65);
    const deadline = performance.now() + 45000;
    // Above 10 m ArduPlane's normal AUTO throttle-suppression gate clears,
    // including when this slow aircraft is below the fixed-wing 5 m/s gate.
    while (this.physics.launchPhase !== 2 || this.state.alt < 12) {
      if (performance.now() > deadline)
        throw Error(
          "Launch did not clear the ground. Reset and check wind conditions.",
        );
      await delay(100, this.lifetime.signal);
    }
    await this.mode(mode);
    this.controls(
      0,
      0,
      altitudeLever(this.state.mode) ? 0.5 : this.physics.config.command[0],
    );
  }
  async upload(items: Waypoint[], progress: (n: number) => void) {
    if (this.busy) throw Error("A mission upload is already in progress.");
    this.busy = true;
    const home: Waypoint = {
      command: 16,
      frame: 0,
      params: [0, 0, 0, 0],
      ...this.home,
    };
    const all = [home, ...items];
    try {
      await new Promise<void>((resolve, reject) => {
        const requested = new Set<number>();
        let last = () =>
            this.send("MISSION_COUNT", { count: all.length, mission_type: 0 }),
          retries = 0;
        const cleanup = () => {
          clearInterval(timer);
          this.listeners.delete(listener);
          this.lifetime.signal.removeEventListener("abort", abort);
        };
        const abort = () => {
          cleanup();
          reject(this.lifetime.signal.reason);
        };
        const fail = (message: string) => {
          cleanup();
          reject(Error(message));
        };
        const listener = (m: Message) => {
          if (
            !["MISSION_ACK", "MISSION_REQUEST", "MISSION_REQUEST_INT"].includes(
              m.name,
            )
          )
            return;
          if (
            m.values.target_system !== 255 ||
            ![0, 190].includes(Number(m.values.target_component)) ||
            Number(m.values.mission_type ?? 0) !== 0
          )
            return;
          if (m.name === "MISSION_ACK") {
            if (Number(m.values.type) === 0 && requested.size !== all.length)
              return;
            cleanup();
            Number(m.values.type) === 0
              ? resolve()
              : reject(Error(`Mission rejected (result ${m.values.type}).`));
            return;
          }
          const seq = Number(m.values.seq),
            w = all[seq];
          if (!w) {
            fail("ArduPlane requested an invalid mission sequence.");
            return;
          }
          requested.add(seq);
          const integer = m.name === "MISSION_REQUEST_INT";
          retries = 0;
          last = () =>
            this.send(integer ? "MISSION_ITEM_INT" : "MISSION_ITEM", {
              seq,
              frame: integer ? (w.frame === 3 ? 6 : 5) : w.frame,
              command: w.command,
              current: 0,
              autocontinue: 1,
              param1: w.params[0],
              param2: w.params[1],
              param3: w.params[2],
              param4: w.params[3],
              x: integer ? Math.round(w.lat * 1e7) : w.lat,
              y: integer ? Math.round(w.lon * 1e7) : w.lon,
              z: w.alt,
              mission_type: 0,
            });
          last();
          progress(seq);
        };
        const timer = setInterval(() => {
          if (++retries > 5)
            fail("Mission upload timed out. The mission is not ready to fly.");
          else last();
        }, 1500);
        this.listeners.add(listener);
        this.lifetime.signal.addEventListener("abort", abort, { once: true });
        last();
      });
    } finally {
      this.busy = false;
    }
  }
  async execute() {
    const confirmed = this.wait(
      (m) => m.name === "MISSION_CURRENT" && m.values.seq === 1,
    );
    this.send("MISSION_SET_CURRENT", { seq: 1 });
    await confirmed;
    await this.mode("AUTO");
  }
}
