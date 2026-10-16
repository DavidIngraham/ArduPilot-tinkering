import { Quaternion, Vector3 } from "@microagu/contracts/math";
import type { FlightFrame } from "@microagu/contracts/flight";
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
