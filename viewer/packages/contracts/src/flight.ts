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
    typeof d.title !== "string" ||
    typeof d.source !== "string" ||
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
      f.command.some((v) => v < 0 || v > 1) ||
      !Array.isArray(f.limits) ||
      f.limits.length !== 3 ||
      !f.limits.every(
        (v) => vec(v, 3) && v[0] < v[1] && (v[2] === 0 || v[2] === 1),
      ) ||
      typeof f.mode !== "string" ||
      typeof f.valid !== "boolean" ||
      (i > 0 && f.t <= d.frames[i - 1].t)
    )
      throw Error("Invalid or unordered flight frame");
  });
  return d;
}
