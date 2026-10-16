import type { Frame } from "@microagu/contracts/recordings";

/** Fixed physical scales: throttle command, and actual actuator travel (not PWM). */
export function drawControls(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  track: Frame[],
) {
  ctx.save();
  ctx.fillStyle = "#142638";
  ctx.fillRect(20, 578, 805, 204);
  ctx.fillRect(840, 578, 420, 204);
  ctx.fillStyle = "#e1edf4";
  ctx.font = "bold 19px system-ui";
  ctx.fillText(
    `THROTTLE COMMAND   ${f.throttle === null ? "N/A" : (100 * f.throttle).toFixed(1) + "%"}`,
    36,
    605,
  );
  ctx.fillText("ACTUAL BRAKE PULL", 856, 605);
  const x = 80,
    y = 622,
    w = 720,
    h = 126;
  ctx.font = "14px system-ui";
  for (const pct of [0, 50, 100]) {
    const yy = y + h * (1 - pct / 100);
    ctx.strokeStyle = "#344b5e";
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
    ctx.fillStyle = "#b8cbd9";
    ctx.fillText(`${pct}%`, 34, yy + 5);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = "#70d8c6";
  ctx.lineWidth = 3;
  ctx.beginPath();
  let connected = false;
  // Keep one preceding sample for clipping at the left edge. Never show future data.
  let first = track.findIndex((g) => g.time_s >= f.time_s - 10);
  first = Math.max(0, first - 1);
  for (const g of [
    ...track.slice(first).filter((g) => g.time_s < f.time_s),
    f,
  ]) {
    if (g.throttle === null) {
      connected = false;
      continue;
    }
    const xx = x + (w * (g.time_s - f.time_s + 10)) / 10;
    const yy = y + h * (1 - g.throttle);
    if (connected) ctx.lineTo(xx, yy);
    else ctx.moveTo(xx, yy);
    connected = true;
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#b8cbd9";
  ctx.fillText("−10 s", x, 771);
  ctx.fillText("−5 s", x + w / 2 - 15, 771);
  ctx.fillText("NOW", x + w - 35, 771);
  const bx = 908,
    bw = 248;
  for (const [i, label, color] of [
    [0, "L", "#70d8c6"],
    [1, "R", "#ffb45b"],
  ] as const) {
    const yy = 633 + i * 54,
      mm = f.brake_mm?.[i];
    ctx.fillStyle = color;
    ctx.font = "bold 20px system-ui";
    ctx.fillText(label, 861, yy + 21);
    ctx.fillStyle = "#283e50";
    ctx.fillRect(bx, yy, bw, 28);
    if (mm !== undefined) {
      ctx.fillStyle = color;
      ctx.fillRect(bx, yy, (bw * Math.max(0, Math.min(100, mm))) / 100, 28);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        bx + (bw * Math.max(0, Math.min(100, mm))) / 100 - 1,
        yy - 4,
        2,
        36,
      );
    }
    ctx.fillStyle = "#e1edf4";
    ctx.font = "17px system-ui";
    ctx.fillText(
      mm === undefined ? "N/A" : `${mm.toFixed(1)} mm`,
      1168,
      yy + 21,
    );
  }
  ctx.font = "13px system-ui";
  ctx.fillStyle = "#b8cbd9";
  ctx.fillText("0 · released", bx, 742);
  ctx.fillText("100 mm", bx + bw - 47, 742);
  ctx.fillText("Same travel scale · left / right", 856, 770);
  ctx.restore();
}
