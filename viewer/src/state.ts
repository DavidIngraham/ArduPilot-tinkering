import { Quaternion, Vector3, Matrix4 } from "three";
export interface Frame {
  schema: "microagu.state.v1";
  time_s: number;
  state: number[];
  rpm: number | null;
  voltage_v: number;
  brake_mm: number[] | null;
  throttle: number | null;
  joint_rotvec_rad: number[];
  joint_rate_rad_s: number[];
  released: boolean;
  // Optional native-log annotations added to a replay, not inferred from motion.
  mode?: "AUTO";
  mission_item?: number;
}
const vector = (x: unknown, n: number): x is number[] =>
  Array.isArray(x) && x.length === n && x.every(Number.isFinite);
export function validate(x: unknown): Frame {
  const f = x as Frame;
  if (
    !f ||
    f.schema !== "microagu.state.v1" ||
    !Number.isFinite(f.time_s) ||
    !vector(f.state, 26) ||
    !(f.brake_mm === null || vector(f.brake_mm, 2)) ||
    !vector(f.joint_rotvec_rad, 3) ||
    !vector(f.joint_rate_rad_s, 3) ||
    !Number.isFinite(f.voltage_v) ||
    ![f.rpm, f.throttle].every((v) => v === null || Number.isFinite(v)) ||
    typeof f.released !== "boolean" ||
    (f.mode !== undefined && f.mode !== "AUTO") ||
    (f.mission_item !== undefined &&
      (!Number.isInteger(f.mission_item) || f.mission_item < 0))
  )
    throw Error("Unsupported or incomplete microagu.state.v1 frame");
  for (const k of [3, 16])
    if (Math.abs(Math.hypot(...f.state.slice(k, k + 4)) - 1) > 0.01)
      throw Error("Body quaternion is not normalized");
  return f;
}
export function parseRecording(text: string): Frame[] {
  const frames = (
    text.trim().startsWith("[")
      ? JSON.parse(text)
      : text
          .trim()
          .split(/\r?\n/)
          .filter(Boolean)
          .map((x) => JSON.parse(x))
  ).map(validate);
  if (!frames.length) throw Error("Recording is empty");
  for (let i = 1; i < frames.length; i++)
    if (frames[i].time_s <= frames[i - 1].time_s)
      throw Error(
        "Time must increase. Split restarted runs into separate recordings.",
      );
  return frames;
}
// Proper rotation: NED [north,east,down] -> Three [east,up,-north].
export const worldBasis = new Quaternion().setFromRotationMatrix(
  new Matrix4().set(0, 1, 0, 0, 0, 0, -1, 0, -1, 0, 0, 0, 0, 0, 0, 1),
);
export function position(v: number[]): Vector3 {
  return new Vector3(v[1], -v[2], -v[0]);
}
export function orientation(q: number[]): Quaternion {
  return worldBasis
    .clone()
    .multiply(new Quaternion(...(q as [number, number, number, number])));
}
export function sample(frames: Frame[], time: number): Frame {
  let low = 0,
    high = frames.length - 1;
  if (time <= frames[0].time_s) return frames[0];
  if (time >= frames[high].time_s) return frames[high];
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (frames[mid].time_s <= time) low = mid;
    else high = mid;
  }
  const a = frames[low],
    b = frames[high],
    t = (time - a.time_s) / (b.time_s - a.time_s);
  const lerp = (x: number, y: number) => x + (y - x) * t;
  const arr = (x: number[], y: number[]) => x.map((v, i) => lerp(v, y[i]));
  const state = arr(a.state, b.state);
  for (const k of [3, 16])
    state.splice(
      k,
      4,
      ...new Quaternion()
        .fromArray(a.state, k)
        .slerp(new Quaternion().fromArray(b.state, k), t)
        .toArray(),
    );
  return {
    ...a,
    time_s: time,
    state,
    rpm: a.rpm === null || b.rpm === null ? null : lerp(a.rpm, b.rpm),
    throttle:
      a.throttle === null || b.throttle === null
        ? null
        : lerp(a.throttle, b.throttle),
    brake_mm:
      a.brake_mm === null || b.brake_mm === null
        ? null
        : arr(a.brake_mm, b.brake_mm),
    joint_rotvec_rad: arr(a.joint_rotvec_rad, b.joint_rotvec_rad),
    joint_rate_rad_s: arr(a.joint_rate_rad_s, b.joint_rate_rad_s),
  };
}
