import * as THREE from "three";
import type { Frame } from "./state";
/** Record a silent, 30 fps, side-by-side view. Physics playback stays at real speed. */
export async function recordFlight(
  scene: THREE.Scene,
  payload: THREE.Group,
  canopy: THREE.Group,
  start: number,
  end: number,
  update: (time: number) => Frame,
  status: (text: string) => void,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
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
          ctx.fillRect(0, 0, 1280, 720);
          const center = payload.position.clone().lerp(canopy.position, 0.5);
          panel(20, 105, 805, 465, new THREE.Vector3(2.5, 1.1, 3.8), center);
          // Payload-mounted inspection camera keeps the capstans in view while the world turns.
          const detailOffset = new THREE.Vector3(
            -0.38,
            0.42,
            -0.18,
          ).applyQuaternion(payload.quaternion);
          panel(840, 105, 420, 465, detailOffset, payload.position.clone());
          ctx.fillStyle = "#70d8c6";
          ctx.font = "13px system-ui";
          ctx.fillText("MICRO-AGU / 9-DOF SIMULATION", 24, 30);
          ctx.fillStyle = "#e1edf4";
          ctx.font = "28px system-ui";
          ctx.fillText(
            "Canopy, payload, and the motion between",
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
          const deg = f.joint_rotvec_rad.map((v) =>
            ((v * 180) / Math.PI).toFixed(1),
          );
          ctx.font = "17px system-ui";
          ctx.fillText(
            `Joint rotation   roll ${deg[0]}°    pitch ${deg[1]}°    yaw ${deg[2]}°`,
            24,
            606,
          );
          ctx.fillText(
            `Brake travel   L ${f.brake_mm?.[0].toFixed(1)} mm    R ${f.brake_mm?.[1].toFixed(1)} mm`,
            24,
            639,
          );
          ctx.fillText(
            `Propeller ${f.rpm?.toFixed(0)} RPM    Throttle ${((f.throttle ?? 0) * 100).toFixed(0)}%`,
            840,
            606,
          );
          ctx.fillText(`t = ${time.toFixed(1)} s   ·   1× playback`, 840, 639);
          ctx.fillStyle = "#8da4b5";
          ctx.font = "13px system-ui";
          ctx.fillText(
            "Simulation truth replay · schematic canopy/lines · no motion exaggeration",
            24,
            685,
          );
          ctx.fillStyle = "#70d8c6";
          ctx.fillRect(24, 701, (1232 * (time - start)) / (end - start), 3);
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
