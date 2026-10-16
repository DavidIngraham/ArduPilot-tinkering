import { Quaternion, Vector3 } from "three";
import type { Frame } from "../state";

export interface PhysicsConfig {
  schema: string;
  model: string;
  parameters: number[];
  parameter_keys: string[];
  mass: number;
  imu: number[];
  state: number[];
  rpm: number;
  command: number[];
  voltage: number;
  brake_rate_mm_s: number;
  brake_offsets_m: number[];
  defaults: string;
  trim_residual: number;
}
export class Physics {
  state: number[];
  rpm: number;
  time = 0;
  released = false;
  brakes: number[];
  command: number[];
  private frame: number | null = null;
  private cached = "";
  private y: number;
  private u: number;
  private p: number;
  private wind: number;
  private out: number;
  private rpmOut: number;
  private windNED = [0, 0, 0];
  setWind(speed: number, fromDegrees: number, up: number) {
    if (
      ![speed, fromDegrees, up].every(Number.isFinite) ||
      speed < 0 ||
      speed > 10 ||
      fromDegrees < 0 ||
      fromDegrees > 360 ||
      Math.abs(up) > 3
    )
      throw Error(
        "Wind must be 0–10 m/s, from 0–360°, with vertical air ±3 m/s.",
      );
    const angle = (fromDegrees * Math.PI) / 180;
    this.windNED = [-speed * Math.cos(angle), -speed * Math.sin(angle), -up];
    this.module.HEAPF64.set(this.windNED, this.wind / 8);
  }
  constructor(
    private module: any,
    readonly config: PhysicsConfig,
  ) {
    if (
      config.schema !== "microagu.physics.v1" ||
      config.state.length !== 26 ||
      config.parameters.length !== 70
    )
      throw Error("Unsupported high-DOF model configuration.");
    this.state = config.state.slice();
    this.rpm = config.rpm;
    this.command = config.command.slice();
    this.brakes = config.command.slice(1);
    const alloc = (n: number) => module._malloc(n * 8);
    this.y = alloc(26);
    this.u = alloc(6);
    this.p = alloc(70);
    this.wind = alloc(3);
    this.out = alloc(52);
    this.rpmOut = alloc(2);
    module.HEAPF64.set(config.parameters, this.p / 8);
    module.HEAPF64.set([0, 0, 0], this.wind / 8);
  }
  static async load(base: string, config?: PhysicsConfig) {
    const url = new URL("highdof.js", base).href;
    const [{ default: create }, data] = await Promise.all([
      import(/* @vite-ignore */ url),
      config ??
        fetch(new URL("highdof.json", base)).then((r) => {
          if (!r.ok) throw Error("Could not load high-DOF configuration");
          return r.json();
        }),
    ]);
    return new Physics(
      await create(
        url.startsWith("file:")
          ? {}
          : { locateFile: (file: string) => new URL(file, base).href },
      ),
      data,
    );
  }
  private observation() {
    const q = new Quaternion().fromArray(this.state, 3).normalize(),
      inverse = q.clone().invert();
    const omega = new Vector3().fromArray(this.state, 10),
      arm = new Vector3().fromArray(this.config.imu).applyQuaternion(q);
    return {
      q,
      inverse,
      position: new Vector3().fromArray(this.state, 0).add(arm),
      velocity: new Vector3()
        .fromArray(this.state, 7)
        .add(omega.clone().cross(arm)),
      gyro: omega.applyQuaternion(inverse),
    };
  }
  respond(packet: Uint8Array) {
    if (![40, 72].includes(packet.length))
      throw Error("Invalid SITL servo packet length");
    const view = new DataView(
        packet.buffer,
        packet.byteOffset,
        packet.byteLength,
      ),
      magic = view.getUint16(0, true),
      rate = view.getUint16(2, true),
      frame = view.getUint32(4, true);
    if (
      magic !== (packet.length === 40 ? 18458 : 29569) ||
      rate < 1 ||
      rate > 2000
    )
      throw Error("Invalid SITL servo packet");
    if (frame === this.frame) return this.cached;
    if (this.frame !== null && frame !== (this.frame + 1) >>> 0)
      throw Error("Physics frame discontinuity; reset the simulator.");
    const dt = 1 / rate,
      before = this.observation();
    if (this.released) {
      const clamp = (x: number, lo: number, hi: number) =>
        Math.max(lo, Math.min(hi, x));
      const pwm = (channel: number) => view.getUint16(8 + channel * 2, true),
        mmPerUS = ((Math.PI * 55) / 360) * 0.1;
      this.command = [
        (clamp(pwm(0), 1000, 2000) - 1000) / 1000,
        (clamp(pwm(2), 800, 2100) - 800) * mmPerUS,
        (2400 - clamp(pwm(3), 900, 2400)) * mmPerUS,
      ];
      const average = this.brakes.map((start, i) => {
        const end =
          start +
          clamp(
            this.command[i + 1] - start,
            -this.config.brake_rate_mm_s * dt,
            this.config.brake_rate_mm_s * dt,
          );
        const travel = Math.abs(end - start) / this.config.brake_rate_mm_s;
        this.brakes[i] = end;
        return (0.5 * (start + end) * travel) / dt + end * (1 - travel / dt);
      });
      const input = [
        this.command[0],
        ...average.map((v, i) => {
          const pull = v / 1000 - this.config.brake_offsets_m[i];
          return this.config.parameters[60] > 0 ? pull : Math.max(0, pull);
        }),
      ];
      this.module.HEAPF64.set(this.state, this.y / 8);
      this.module.HEAPF64.set([...input, ...input], this.u / 8);
      const count = this.module._causal_replay(
        this.y,
        this.u,
        2,
        dt,
        Math.max(1, Math.ceil(dt / 0.00125)),
        this.p,
        this.config.mass,
        this.wind,
        this.config.voltage,
        this.rpm,
        this.out,
        this.rpmOut,
      );
      if (count !== 2)
        throw Error("The 9-DOF physics diverged; reset the simulator.");
      this.state = Array.from(
        this.module.HEAPF64.subarray(this.out / 8 + 26, this.out / 8 + 52),
      );
      this.rpm = this.module.HEAPF64[this.rpmOut / 8 + 1];
      if (!this.state.every(Number.isFinite) || !Number.isFinite(this.rpm))
        throw Error("Non-finite physics state; reset the simulator.");
      if (this.state[2] >= 0)
        throw Error(
          "Ground reached. This airborne research model has no contact dynamics; reset for another flight.",
        );
    } else {
      for (let i = 0; i < 3; i++) {
        const delta = this.state[7 + i] * dt;
        this.state[i] += delta;
        this.state[13 + i] += delta;
      }
    }
    const obs = this.observation(),
      accel = obs.velocity
        .clone()
        .sub(before.velocity)
        .divideScalar(dt)
        .sub(new Vector3(0, 0, 9.80665))
        .applyQuaternion(obs.inverse);
    this.time += dt;
    const message = {
      timestamp: this.time,
      battery: { voltage: this.config.voltage },
      imu: { gyro: obs.gyro.toArray(), accel_body: accel.toArray() },
      position: obs.position.toArray(),
      quaternion: [this.state[6], ...this.state.slice(3, 6)],
      velocity: obs.velocity.toArray(),
      airspeed: Math.hypot(
        ...this.state.slice(7, 10).map((v, i) => v - this.windNED[i]),
      ),
      velocity_wind: this.windNED.slice(),
    };
    this.frame = frame;
    this.cached = "\n" + JSON.stringify(message) + "\n";
    return this.cached;
  }
  truth(): Frame {
    const payload = new Quaternion().fromArray(this.state, 3).normalize(),
      canopy = new Quaternion().fromArray(this.state, 16).normalize();
    const relative = payload.clone().invert().multiply(canopy);
    if (relative.w < 0) {
      relative.x *= -1;
      relative.y *= -1;
      relative.z *= -1;
      relative.w *= -1;
    }
    const sin = Math.hypot(relative.x, relative.y, relative.z),
      scale = sin < 1e-12 ? 2 : (2 * Math.atan2(sin, relative.w)) / sin;
    const rate = new Vector3()
      .fromArray(this.state, 23)
      .sub(new Vector3().fromArray(this.state, 10))
      .applyQuaternion(payload.invert());
    return {
      schema: "microagu.state.v1",
      time_s: this.time,
      state: this.state.slice(),
      rpm: this.rpm,
      voltage_v: this.config.voltage,
      brake_mm: this.brakes.slice(),
      throttle: this.command[0],
      released: this.released,
      wind_ned_m_s: this.windNED.slice(),
      joint_rotvec_rad: [
        relative.x * scale,
        relative.y * scale,
        relative.z * scale,
      ],
      joint_rate_rad_s: rate.toArray(),
    };
  }
}
