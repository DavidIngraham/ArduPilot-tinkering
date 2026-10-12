import { Quaternion, Vector3 } from "three";
export interface FlightFrame {
  t: number;
  p: number[];
  q: number[];
  mode: string;
  pwm: number[];
  command: number[];
  limits: number[][];
  valid: boolean;
}
export interface FlightReplay {
  schema: "microagu.flight.v1";
  title: string;
  source: string;
  frames: FlightFrame[];
}
export function parseFlight(text: string): FlightReplay {
  const d = JSON.parse(text) as FlightReplay;
  if (
    d.schema !== "microagu.flight.v1" ||
    typeof d.title !== "string" || typeof d.source !== "string" ||
    !Array.isArray(d.frames) ||
    d.frames.length < 2
  )
    throw Error("Expected microagu.flight.v1 recording");
  const vec = (v: unknown, n: number) =>
    Array.isArray(v) && v.length === n && v.every(Number.isFinite);
  d.frames.forEach((f, i) => {
    if (
      !Number.isFinite(f.t) ||
      !vec(f.p, 3) ||
      !vec(f.q, 4) ||
      Math.abs(Math.hypot(...f.q) - 1) > 0.01 ||
      !vec(f.pwm, 3) ||
      !vec(f.command, 3) ||
      f.command.some(v => v < 0 || v > 1) ||
      !Array.isArray(f.limits) || f.limits.length !== 3 ||
      !f.limits.every(v => vec(v, 3) && v[0] < v[1] && (v[2] === 0 || v[2] === 1)) ||
      typeof f.mode !== "string" ||
      typeof f.valid !== "boolean" ||
      (i > 0 && f.t <= d.frames[i - 1].t)
    )
      throw Error("Invalid or unordered flight frame");
  });
  return d;
}
export function flightAt(frames: FlightFrame[], t: number): FlightFrame {
  let lo = 0,
    hi = frames.length - 1;
  if (t <= frames[0].t) return frames[0];
  if (t >= frames[hi].t) return frames[hi];
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (frames[m].t <= t) lo = m;
    else hi = m;
  }
  const a = frames[lo],
    b = frames[hi],
    u = (t - a.t) / (b.t - a.t);
  return {
    ...a,
    t,
    p: new Vector3()
      .fromArray(a.p)
      .lerp(new Vector3().fromArray(b.p), u)
      .toArray(),
    q: new Quaternion()
      .fromArray(a.q)
      .slerp(new Quaternion().fromArray(b.q), u)
      .toArray(),
    valid: a.valid && b.valid && b.t - a.t <= 0.25,
  };
}
