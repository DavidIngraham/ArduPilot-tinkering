import type { Frame } from "../state";
import type { Telemetry } from "./runtime";
import { HOME, type Waypoint } from "./mission";
export class SimulatorClient {
  state: Telemetry = {
    mode: -1,
    armed: false,
    lat: HOME.lat,
    lon: HOME.lon,
    alt: 100,
    speed: 0,
    climb: 0,
    roll: 0,
    pitch: 0,
    yaw: 0,
    servos: [],
    mission: 0,
    lastHeartbeat: 0,
  };
  trimThrottle = 0.45;
  onUpdate = () => {};
  onTruth = (frame: Frame) => {};
  onLog = (text: string) => {};
  onError = (text: string) => {};
  private worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  private id = 0;
  private pending = new Map<
    number,
    {
      resolve: () => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private progress = (n: number) => {};
  constructor() {
    this.worker.onmessage = ({ data }) => {
      switch (data.kind) {
        case "state": {
          // performance.now() has a different origin in the dedicated worker.
          const heartbeatChanged =
            this.state.lastHeartbeat !== data.data.lastHeartbeat;
          this.state = { ...data.data };
          if (heartbeatChanged) this.lastReceipt = performance.now();
          this.onUpdate();
          return;
        }
        case "truth":
          this.onTruth(data.data);
          return;
        case "log":
          this.onLog(data.data);
          return;
        case "error":
          this.onError(data.data);
          this.failPending(data.data);
          return;
        case "progress":
          this.progress(data.data);
          return;
        case "trimThrottle":
          this.trimThrottle = data.data;
          return;
      }
      const pending = this.pending.get(data.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(data.id);
        data.ok ? pending.resolve() : pending.reject(Error(data.error));
      }
    };
    this.worker.onerror = (e) => {
      this.onError(e.message);
      this.failPending(e.message);
    };
  }
  lastReceipt = 0;
  private failPending(text: string) {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(Error(text));
    }
    this.pending.clear();
  }
  private call(method: string, ...args: unknown[]) {
    return new Promise<void>((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(
        () => {
          this.pending.delete(id);
          reject(Error("Simulator request timed out; reset to restart."));
        },
        method === "start" ? 120000 : 30000,
      );
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, method, args });
    });
  }
  start() {
    return this.call(
      "start",
      new URL("wasm/arduplane.js", document.baseURI).href,
    );
  }
  mode(name: string) {
    return this.call("mode", name);
  }
  launch(mode: string) {
    return this.call("launch", mode);
  }
  execute() {
    return this.call("execute");
  }
  controls(roll: number, pitch: number, throttle: number) {
    this.worker.postMessage({
      method: "controls",
      args: [roll, pitch, throttle],
    });
  }
  upload(items: Waypoint[], progress: (n: number) => void) {
    this.progress = progress;
    return this.call("upload", items);
  }
}
