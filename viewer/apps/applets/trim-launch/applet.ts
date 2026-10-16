import { registerApplet } from "@microagu/applet-ui/shell/mount";
import {
  ManagedRenderer,
  ManagedScene,
} from "@microagu/rendering/scene/resources";
import { ModelAssets } from "@microagu/rendering/assets/models";
import { definition } from "./definition";
import {
  canopyGeometry,
  canopyMaterial,
  canopyPoint,
} from "@microagu/rendering/aircraft/paraglider";
import * as T from "three";
export const applet = registerApplet(definition, async (scope) => {
  const assets = scope.own(new ModelAssets(scope.signal));

  // Keyframed explanation of the pilot's technique, not an inflation solver.
  async function main() {
    const canvas = scope.node(document.createElement("canvas"));
    canvas.width = 1600;
    canvas.height = 900;
    document.querySelector("#view")!.append(canvas);
    const ctx = canvas.getContext("2d")!;
    const renderer = scope.own(new ManagedRenderer({ antialias: true }));
    renderer.setSize(1600, 690);
    renderer.setPixelRatio(1);
    const detail = scope.own(new ManagedRenderer({ antialias: true }));
    detail.setSize(360, 300);
    detail.setPixelRatio(1);
    const closeCamera = new T.OrthographicCamera(
      -0.32,
      0.32,
      0.27,
      -0.27,
      0.01,
      20,
    );
    const scene = scope.own(new ManagedScene());
    scene.background = new T.Color("#142534");
    scene.add(new T.HemisphereLight(0xeeffff, 0x536575, 3));
    const light = new T.DirectionalLight(0xffffff, 3);
    light.position.set(0, 5, 6);
    scene.add(light);
    const body = new T.Group();
    const asset = await assets.load(
      new URL("models/microagu-payload-tl.glb", document.baseURI).href,
    );
    body.add(asset.scene);
    scene.add(body);
    const basis = new T.Quaternion().setFromAxisAngle(
      new T.Vector3(1, 0, 0),
      Math.PI / 2,
    );
    const ground = new T.GridHelper(16, 32, 0x506575, 0x304657);
    scene.add(ground);
    const geometry = canopyGeometry();
    geometry.rotateX(Math.PI / 2);
    const wing = new T.Mesh(geometry, canopyMaterial());
    scene.add(wing);
    const lines = new T.LineSegments(
      new T.BufferGeometry(),
      new T.LineBasicMaterial({ color: 0xc8d7e2 }),
    );
    scene.add(lines);
    const trail = new T.Line(
      new T.BufferGeometry(),
      new T.LineDashedMaterial({
        color: 0x71cfa7,
        dashSize: 0.1,
        gapSize: 0.08,
      }),
    );
    scene.add(trail);
    const camera = new T.OrthographicCamera(-5.4, 5.4, 3, -1.65, 0.1, 50);
    camera.position.set(0, 2.4, 13);
    camera.lookAt(0, 1.05, 0);
    const smooth = (x: number) => {
      x = T.MathUtils.clamp(x, 0, 1);
      return x * x * (3 - 2 * x);
    };
    function pose(t: number) {
      const arc = smooth((t - 2) / 4),
        angle = Math.PI * (1 - arc);
      const glide = Math.max(0, t - 6);
      return {
        x: -3.1 + 0.7 * Math.cos(angle) + 0.35 * glide,
        y: 1.3 + 0.7 * Math.sin(angle) - 0.07 * glide,
        arc,
        glide,
      };
    }
    function draw(t: number) {
      const p = pose(t);
      body.position.set(p.x, p.y, 0);
      const rotation =
        t < 6
          ? Math.PI * (1 - p.arc)
          : -0.06 + 0.045 * Math.sin(p.glide * 2) * Math.exp(-p.glide * 0.6);
      body.quaternion.copy(
        new T.Quaternion()
          .setFromAxisAngle(new T.Vector3(0, 0, 1), rotation)
          .multiply(basis),
      );
      const inflate = smooth((t - 2.4) / 3.2);
      wing.position.set(
        T.MathUtils.lerp(-5, p.x - 0.06, inflate),
        T.MathUtils.lerp(0.035, p.y + 1.22, inflate),
        0,
      );
      wing.scale.set(1, 0.12 + 0.88 * inflate, 1);
      wing.rotation.z = 0.07 * (1 - inflate);
      const vertices: number[] = [];
      for (const side of [-1, 1])
        for (const chord of [-0.22, 0.22])
          for (const span of [0.35, 0.75, 1]) {
            const a = canopyPoint(side * span, (0.27 - chord) / 0.54)
              .applyAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2)
              .multiply(wing.scale)
              .applyEuler(wing.rotation)
              .add(wing.position);
            const b = new T.Vector3(0, 0.13, side * 0.12)
              .applyQuaternion(
                new T.Quaternion().setFromAxisAngle(
                  new T.Vector3(0, 0, 1),
                  rotation,
                ),
              )
              .add(body.position);
            const mid = a.clone().lerp(b, 0.5);
            mid.y -= 0.25 * (1 - inflate);
            vertices.push(
              ...a.toArray(),
              ...mid.toArray(),
              ...mid.toArray(),
              ...b.toArray(),
            );
          }
      lines.geometry.dispose();
      lines.geometry = new T.BufferGeometry();
      lines.geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(vertices, 3),
      );
      const history: T.Vector3[] = [];
      for (let s = 2; s <= t; s += 0.08) {
        const q = pose(s);
        history.push(new T.Vector3(q.x, q.y, 0));
      }
      trail.geometry.dispose();
      trail.geometry = new T.BufferGeometry().setFromPoints(history);
      trail.computeLineDistances();
      renderer.render(scene, camera);
      ctx.fillStyle = "#0b1520";
      ctx.fillRect(0, 0, 1600, 900);
      ctx.fillStyle = "#edf5ff";
      ctx.font = "32px system-ui";
      ctx.fillText("Manual trim: inflation, release and passive glide", 32, 48);
      const phase =
        t < 2
          ? "1  Inverted start"
          : t < 6
            ? "2  Arc the carriage to inflate the canopy"
            : "3  Release upright; observe the glide";
      ctx.font = "25px system-ui";
      ctx.fillStyle = "#a9dbe9";
      ctx.fillText(phase, 32, 91);
      ctx.drawImage(renderer.domElement, 0, 110);
      closeCamera.position.copy(body.position).add(new T.Vector3(0.2, 0.12, 2));
      closeCamera.lookAt(body.position);
      detail.render(scene, closeCamera);
      ctx.drawImage(detail.domElement, 1208, 150);
      ctx.strokeStyle = "#698494";
      ctx.lineWidth = 1;
      ctx.strokeRect(1208, 150, 360, 300);
      ctx.font = "20px system-ui";
      ctx.fillStyle = "#edf5ff";
      ctx.fillText("Carriage attitude · prop stopped", 1212, 138);
      ctx.fillStyle = "#edf5ff";
      ctx.font = "23px system-ui";
      ctx.fillText(
        "Power off · fixed drum positions · no active control",
        32,
        827,
      );
      ctx.font = "19px system-ui";
      ctx.fillStyle = "#afc1d1";
      ctx.fillText(
        "Technique illustration using the payload CAD. Canopy shape, trajectory and timing are illustrative; not an inflation simulation.",
        32,
        868,
      );
    }
    let time = 0,
      last = performance.now(),
      playing = true,
      recording = false;
    const slider = document.querySelector<HTMLInputElement>("#time")!;
    function loop(now: number) {
      if (playing) time = (time + Math.min(0.1, (now - last) / 1000)) % 18;
      last = now;
      slider.value = String(time);
      draw(time);
      scope.requestFrame(loop);
    }
    scope.requestFrame(loop);
    scope.listen(document.querySelector("#play")!, "click", () => {
      playing = !playing;
      document.querySelector("#play")!.textContent = playing ? "Pause" : "Play";
    });
    scope.listen(slider, "input", () => {
      time = Number(slider.value);
      playing = false;
      document.querySelector("#play")!.textContent = "Play";
    });
    for (const [id, value] of [
      ["start", 0],
      ["release", 6],
    ] as const)
      scope.listen(document.querySelector("#" + id)!, "click", () => {
        time = value;
        playing = false;
        document.querySelector("#play")!.textContent = "Play";
      });
    document.querySelector("#status")!.textContent = "Ready";
    scope.listen(document.querySelector("#record")!, "click", () => {
      if (recording) return;
      recording = true;
      time = 0;
      playing = true;
      last = performance.now();
      const chunks: BlobPart[] = [];
      const recorder = scope.recorder(
        new MediaRecorder(canvas.captureStream(30), {
          mimeType: "video/webm;codecs=vp9",
          videoBitsPerSecond: 6500000,
        }),
      );
      scope.property(recorder, "ondataavailable", (e) => chunks.push(e.data));
      scope.property(recorder, "onstop", () => {
        const a = document.querySelector<HTMLAnchorElement>("#save")!;
        a.href = scope.objectURL(new Blob(chunks, { type: "video/webm" }));
        a.hidden = false;
        recording = false;
        document.querySelector("#status")!.textContent = "Video ready";
      });
      recorder.start();
      document.querySelector("#status")!.textContent = "Recording";
      scope.timeout(() => recorder.stop(), 18000);
    });
  }

  await main().catch(
    (e) => (document.querySelector("#status")!.textContent = String(e)),
  );
});
