import * as THREE from "three";
import type { Frame } from "./state";
import { drawWindFlag } from "./wind";
import { drawControls } from "./controls";
/** Record a silent, 30 fps, side-by-side view. Physics playback stays at real speed. */
export async function recordFlight(
  scene: THREE.Scene,
  payload: THREE.Group,
  canopy: THREE.Group,
  start: number,
  end: number,
  update: (time: number) => Frame,
  status: (text: string) => void,
  track: Frame[] = [],
): Promise<Blob> {
  const auto = track.length > 0 && track.every((f) => f.mode === "AUTO");
  const north = track.map((f) => f.state[0]),
    east = track.map((f) => f.state[1]);
  const minN = Math.min(...north),
    maxN = Math.max(...north);
  const minE = Math.min(...east),
    maxE = Math.max(...east);
  const span = Math.max(maxN - minN, maxE - minE, 1);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 900;
  const ctx = canvas.getContext("2d")!;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.005, 20000);
  const stream = canvas.captureStream(30);
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8"].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
  if (!mime) throw Error("This browser cannot record WebM video");
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 5000000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const complete = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    recorder.onerror = () => reject(Error("Video recording failed"));
  });
  function panel(
    x: number,
    y: number,
    w: number,
    h: number,
    offset: THREE.Vector3,
    target: THREE.Vector3,
  ) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
    renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, x, y, w, h);
  }
  const started = performance.now();
  recorder.start();
  try {
    await new Promise<void>((resolve, reject) => {
      function frame(now: number) {
        try {
          const time = Math.min(end, start + (now - started) / 1000);
          const f = update(time);
          ctx.fillStyle = "#0b1520";
          ctx.fillRect(0, 0, 1280, 900);
          const center = payload.position.clone().lerp(canopy.position, 0.5);
          panel(20, 105, 805, 465, new THREE.Vector3(2.5, 1.1, 3.8), center);
          // Payload-mounted inspection camera keeps the capstans in view while the world turns.
          const detailOffset = new THREE.Vector3(
            -0.18,
            0.48,
            -0.15,
          ).applyQuaternion(payload.quaternion);
          panel(840, 105, 420, 465, detailOffset, payload.position.clone());
          ctx.fillStyle = "#70d8c6";
          ctx.font = "13px system-ui";
          ctx.fillText(
            f.turbulence
              ? "MICRO-AGU / 9-DOF SIMULATION · MODERATE SYNTHETIC TURBULENCE"
              : "MICRO-AGU / 9-DOF SIMULATION",
            24,
            30,
          );
          ctx.fillStyle = "#e1edf4";
          ctx.font = "28px system-ui";
          ctx.fillText(
            auto
              ? "ArduPilot AUTO · the controller flies the mission"
              : "Canopy, payload, and the motion between",
            24,
            66,
          );
          ctx.font = "14px system-ui";
          ctx.fillText(
            "Canopy + payload · actual simulated articulation",
            34,
            129,
          );
          ctx.fillText("SolidWorks payload · capstans + rotor", 850, 129);
          if (auto) {
            ctx.fillStyle = "rgba(11,21,32,.9)";
            ctx.fillRect(34, 373, 182, 183);
            ctx.fillStyle = "#e1edf4";
            ctx.font = "12px system-ui";
            ctx.fillText("Excerpt track · N ↑", 44, 392);
            const point = (g: Frame) => [
              48 + ((g.state[1] - (minE + maxE) / 2) / span) * 140 + 70,
              408 - ((g.state[0] - (minN + maxN) / 2) / span) * 140 + 70,
            ];
            ctx.beginPath();
            track.forEach((g, i) => {
              const [x, y] = point(g);
              if (i) ctx.lineTo(x, y);
              else ctx.moveTo(x, y);
            });
            ctx.strokeStyle = "#557788";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            track
              .filter((g) => g.time_s <= time)
              .forEach((g, i) => {
                const [x, y] = point(g);
                if (i) ctx.lineTo(x, y);
                else ctx.moveTo(x, y);
              });
            ctx.strokeStyle = "#70d8c6";
            ctx.stroke();
            const [x, y] = point(f);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
          }
          drawWindFlag(ctx, f);
          drawControls(ctx, f, track);
          const deg = f.joint_rotvec_rad.map((v) =>
            ((v * 180) / Math.PI).toFixed(1),
          );
          ctx.font = "17px system-ui";
          ctx.fillText(
            `Joint rotation   roll ${deg[0]}°    pitch ${deg[1]}°    yaw ${deg[2]}°`,
            24,
            812,
          );
          ctx.fillText(
            `Brake travel   L ${f.brake_mm?.[0].toFixed(1)} mm    R ${f.brake_mm?.[1].toFixed(1)} mm`,
            24,
            841,
          );
          ctx.fillText(
            `Propeller ${f.rpm?.toFixed(0)} RPM    Throttle ${((f.throttle ?? 0) * 100).toFixed(0)}%`,
            840,
            812,
          );
          ctx.fillText(`t = ${time.toFixed(1)} s   ·   1× playback`, 840, 841);
          ctx.fillStyle = "#8da4b5";
          ctx.font = "13px system-ui";
          if (f.wind_ned_m_s)
            ctx.fillText(
              `Gust velocity N / E / D: ${f.wind_ned_m_s.map((v) => v.toFixed(2)).join(" / ")} m/s`,
              24,
              862,
            );
          ctx.fillText(
            auto
              ? `Native AUTO · mission item ${f.mission_item} · altitude ${(-f.state[2]).toFixed(1)} m · schematic canopy/lines · no motion exaggeration`
              : "Simulation truth replay · schematic canopy/lines · no motion exaggeration",
            24,
            882,
          );
          ctx.fillStyle = "#70d8c6";
          ctx.fillRect(24, 890, (1232 * (time - start)) / (end - start), 3);
          status(
            `Recording ${Math.round((100 * (time - start)) / (end - start))}%`,
          );
          if (time >= end) {
            resolve();
          } else requestAnimationFrame(frame);
        } catch (e) {
          reject(e);
        }
      }
      requestAnimationFrame(frame);
    });
    recorder.stop();
    return await complete;
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
    renderer.dispose();
  }
}
