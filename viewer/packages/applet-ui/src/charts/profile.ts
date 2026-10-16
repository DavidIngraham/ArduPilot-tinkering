import type { Frame } from "@microagu/contracts/recordings";

/** Unwrap the ground track into distance travelled, so a loiter does not fold over itself. */
export function flightProfile(track: Frame[]) {
  let distance = 0;
  return track.map((f, i) => {
    if (i)
      distance += Math.hypot(
        f.state[0] - track[i - 1].state[0],
        f.state[1] - track[i - 1].state[1],
      );
    return { time: f.time_s, distance, altitude: -f.state[2] };
  });
}
export function drawProfile(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  profile: ReturnType<typeof flightProfile>,
) {
  if (!profile.length) return;
  ctx.save();
  ctx.fillStyle = "rgba(11,21,32,.94)";
  ctx.fillRect(34, 394, 240, 162);
  ctx.fillStyle = "#e1edf4";
  ctx.font = "12px system-ui";
  ctx.fillText("Side profile · altitude (m)", 44, 413);
  // A minimum 10 m range avoids magnifying tiny calm-air altitude variations.
  const center = 5 * Math.round(profile[0].altitude / 5);
  const low = Math.min(
    center - 5,
    5 * Math.floor(Math.min(...profile.map((p) => p.altitude)) / 5),
  );
  const high = Math.max(
    center + 5,
    5 * Math.ceil(Math.max(...profile.map((p) => p.altitude)) / 5),
  );
  const x = 68,
    y = 428,
    w = 192,
    h = 90;
  const end = Math.max(1, profile.at(-1)!.distance);
  const point = (p: (typeof profile)[number]) => [
    x + (w * p.distance) / end,
    y + (h * (high - p.altitude)) / (high - low),
  ];
  for (const alt of [low, (low + high) / 2, high]) {
    const yy = y + (h * (high - alt)) / (high - low);
    ctx.fillStyle = "#b8cbd9";
    ctx.fillText(`${alt}`, 44, yy + 4);
    ctx.strokeStyle = alt === center ? "#698294" : "#344b5e";
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = "#557788";
  ctx.lineWidth = 2;
  ctx.beginPath();
  profile.forEach((p, i) => {
    const [xx, yy] = point(p);
    if (i) ctx.lineTo(xx, yy);
    else ctx.moveTo(xx, yy);
  });
  ctx.stroke();
  ctx.strokeStyle = "#70d8c6";
  ctx.beginPath();
  const past = profile.filter((p) => p.time <= f.time_s);
  past.forEach((p, i) => {
    const [xx, yy] = point(p);
    if (i) ctx.lineTo(xx, yy);
    else ctx.moveTo(xx, yy);
  });
  ctx.stroke();
  const before = past.at(-1) ?? profile[0],
    after = profile[past.length] ?? before;
  const fraction =
    after.time === before.time
      ? 0
      : (f.time_s - before.time) / (after.time - before.time);
  const [xx, yy] = point({
    time: f.time_s,
    distance: before.distance + fraction * (after.distance - before.distance),
    altitude: -f.state[2],
  });
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(xx, yy, 3, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#b8cbd9";
  ctx.font = "11px system-ui";
  ctx.fillText("0", x, 533);
  ctx.fillText(`${Math.round(end)} m`, x + w - 36, 533);
  ctx.fillText(
    `Distance flown · now ${(-f.state[2]).toFixed(2)} m high`,
    44,
    548,
  );
  ctx.restore();
}
