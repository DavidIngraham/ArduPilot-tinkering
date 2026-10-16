import { Quaternion } from "@microagu/contracts/math";
import type { Frame } from "@microagu/contracts/recordings";
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
    inflation:
      a.inflation === undefined || b.inflation === undefined
        ? a.inflation
        : lerp(a.inflation, b.inflation),
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
