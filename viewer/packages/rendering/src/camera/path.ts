import { Vector3 } from "three";
import { position } from "@microagu/rendering/coordinates/ned";
export interface TimedPosition {
  time_s: number;
  position: number[];
}
/** Symmetric boxcar camera path; linear endpoint extrapolation preserves steady travel. */
export function cameraPath(
  frames: TimedPosition[],
  halfWindowSeconds = 0.5,
): Vector3[] {
  const times = frames.map((f) => f.time_s),
    points = frames.map((f) => position(f.position));
  const at = (t: number) => {
    let lo = 0,
      hi = times.length - 1;
    if (t <= times[0]) hi = 1;
    else if (t >= times[hi]) lo = hi - 1;
    else {
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (times[m] <= t) lo = m;
        else hi = m;
      }
    }
    return points[lo]
      .clone()
      .lerp(points[hi], (t - times[lo]) / (times[hi] - times[lo]));
  };
  return times.map((t) => {
    const sum = new Vector3();
    for (let j = -25; j <= 25; j++)
      sum.add(at(t + (j * halfWindowSeconds) / 25));
    return sum.multiplyScalar(1 / 51);
  });
}
/** Use the same continuous replay timestamp as the aircraft, never a rounded sample index. */
export function cameraAt(
  frames: { time_s: number }[],
  path: Vector3[],
  t: number,
): Vector3 {
  let lo = 0,
    hi = frames.length - 1;
  if (t <= frames[0].time_s) return path[0].clone();
  if (t >= frames[hi].time_s) return path[hi].clone();
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (frames[m].time_s <= t) lo = m;
    else hi = m;
  }
  return path[lo]
    .clone()
    .lerp(
      path[hi],
      (t - frames[lo].time_s) / (frames[hi].time_s - frames[lo].time_s),
    );
}
