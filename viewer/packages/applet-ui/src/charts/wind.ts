import type { Frame } from "@microagu/contracts/recordings";

/** Earth-frame wind (not aircraft-relative flow); the flag extends downwind. */
export function drawWindFlag(ctx: CanvasRenderingContext2D, f: Frame) {
  if (!f.wind_ned_m_s) return;
  const [north, east, down] = f.wind_ned_m_s;
  const speed = Math.hypot(north, east);
  const bearing = ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
  ctx.save();
  ctx.fillStyle = "rgba(11,21,32,.93)";
  ctx.fillRect(625, 373, 186, 183);
  ctx.fillStyle = "#e1edf4";
  ctx.font = "13px system-ui";
  ctx.fillText("WIND FLAG · N ↑", 637, 393);
  const x = 718,
    y = 444;
  ctx.strokeStyle = "#557788";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 32, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "11px system-ui";
  ctx.fillText("N", x - 4, y - 36);
  ctx.fillText("E", x + 37, y + 4);
  if (speed > 0.02) {
    const dx = east / speed,
      dy = -north / speed;
    const length = 12 + 23 * Math.min(speed / 1.5, 1);
    ctx.fillStyle = "#ffb84d";
    ctx.beginPath();
    ctx.moveTo(x - dy * 6, y + dx * 6);
    ctx.lineTo(x + dx * length, y + dy * length);
    ctx.lineTo(x + dy * 6, y - dx * 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, 2 * Math.PI);
  ctx.fill();
  ctx.font = "12px system-ui";
  ctx.fillText(
    speed > 0.02
      ? `Blowing TO ${bearing.toFixed(0).padStart(3, "0")}°`
      : "Horizontal calm",
    637,
    499,
  );
  ctx.fillText(`Horizontal ${speed.toFixed(2)} m/s`, 637, 519);
  ctx.fillStyle = "#70d8c6";
  ctx.fillText(
    `Vertical ${down <= 0 ? "↑" : "↓"} ${Math.abs(down).toFixed(2)} m/s`,
    637,
    541,
  );
  ctx.restore();
}
