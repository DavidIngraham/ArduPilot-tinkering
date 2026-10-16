import { registerApplet } from "@microagu/applet-ui/shell/mount";
import {
  ManagedRenderer,
  ManagedScene,
} from "@microagu/rendering/scene/resources";
import { ModelAssets } from "@microagu/rendering/assets/models";
import { definition } from "./definition";
import { playback } from "@microagu/applet-ui/controls/playback";
import {
  canopyGeometry,
  canopyMaterial,
  canopyPoint,
} from "@microagu/rendering/aircraft/paraglider";
import * as T from "three";
export const applet = registerApplet(definition, async (scope) => {
  const assets = scope.own(new ModelAssets(scope.signal));

  async function main() {
    const canvas = scope.node(document.createElement("canvas"));
    canvas.width = 1600;
    canvas.height = 1000;
    document.querySelector("#view")!.append(canvas);
    const c = canvas.getContext("2d")!;
    const renderer = scope.own(new ManagedRenderer({ antialias: true }));
    renderer.setSize(760, 690);
    renderer.setPixelRatio(1);
    const asset = await assets.load(
      new URL("models/microagu-payload-tl.glb", document.baseURI).href,
    );
    const scenes = [0, 1].map(() => {
      const scene = scope.own(new ManagedScene());
      scene.background = new T.Color("#142534");
      scene.add(new T.HemisphereLight(0xeeffff, 0x536575, 3));
      const light = new T.DirectionalLight(0xffffff, 3);
      light.position.set(-1, 2, 4);
      scene.add(light);
      const body = new T.Group();
      body.add(asset.scene.clone(true));
      scene.add(body);
      const geometry = canopyGeometry();
      geometry.rotateX(Math.PI / 2); // FRD -> explanatory x-forward, y-up, z-span frame.
      const wing = new T.Mesh(geometry, canopyMaterial());
      scene.add(wing);
      const lines = new T.LineSegments(
        new T.BufferGeometry(),
        new T.LineBasicMaterial({ color: 0xa8c5d8 }),
      );
      scene.add(lines);
      const camera = new T.OrthographicCamera(
        -0.77,
        0.77,
        0.82,
        -0.28,
        0.1,
        10,
      );
      camera.position.set(0, 0, 3);
      camera.lookAt(0, 0, 0);
      return { scene, body, wing, lines, camera };
    });
    const basis = new T.Quaternion().setFromAxisAngle(
        new T.Vector3(1, 0, 0),
        Math.PI / 2,
      ),
      z = new T.Vector3(0, 0, 1);
    const smooth = (v: number) => {
      v = T.MathUtils.clamp(v, 0, 1);
      return v * v * (3 - 2 * v);
    };
    let epoch = performance.now(),
      recording = false;
    const green = "#72e3a7",
      blue = "#8ec9f3",
      red = "#ff9990";
    function arrow(a: T.Vector2, b: T.Vector2, color: string, label = "") {
      c.strokeStyle = color;
      c.fillStyle = color;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      c.beginPath();
      c.moveTo(b.x, b.y);
      c.lineTo(b.x - 14 * Math.cos(ang - 0.4), b.y - 14 * Math.sin(ang - 0.4));
      c.lineTo(b.x - 14 * Math.cos(ang + 0.4), b.y - 14 * Math.sin(ang + 0.4));
      c.closePath();
      c.fill();
      if (label) {
        c.font = "21px system-ui";
        c.fillText(label, a.x, Math.min(a.y, b.y) - 20);
      }
    }
    function draw(t: number) {
      c.fillStyle = "#0b1520";
      c.fillRect(0, 0, 1600, 1000);
      c.fillStyle = "#eef6ff";
      c.font = "31px system-ui";
      c.fillText(
        "Throttle step: whole-aircraft pitch versus payload pitch",
        24,
        42,
      );
      c.font = "21px system-ui";
      c.fillStyle = "#b8cbd9";
      c.fillText("Side view · translation and pitch only · forward →", 24, 77);
      const amount = smooth((t - 2) / 3) * (1 - smooth((t - 11) / 3));
      const force = smooth((t - 1.7) / 0.5) * (1 - smooth((t - 10.8) / 0.5));
      scenes.forEach((s, i) => {
        const x = 20 + i * 800,
          y = 130;
        const theta = (((i === 0 ? 12 : -16) * Math.PI) / 180) * amount;
        const wingTheta = (((i === 0 ? 12 : 2) * Math.PI) / 180) * amount;
        const q = new T.Quaternion().setFromAxisAngle(z, theta);
        const h = new T.Vector3(0.0053, 0.102, 0);
        let p: T.Vector3, H: T.Vector3, W: T.Vector3;
        if (i === 0) {
          const g = new T.Vector3(0, 0.23, 0);
          p = new T.Vector3()
            .sub(g)
            .applyQuaternion(q)
            .add(g)
            .add(new T.Vector3(0.08 * amount, 0, 0));
          H = h.clone().applyQuaternion(q).add(p);
          W = new T.Vector3(0, 0.602, 0).applyQuaternion(q).add(p);
        } else {
          H = h.clone().add(new T.Vector3(0.16 * amount, 0.012 * amount, 0));
          p = H.clone().sub(h.clone().applyQuaternion(q));
          W = H.clone().add(new T.Vector3(-0.03 * amount, 0.5, 0));
        }
        s.body.position.copy(p);
        s.body.quaternion.copy(q).multiply(basis);
        s.wing.position.copy(W);
        s.wing.rotation.z = wingTheta;
        const pts = [-0.23, 0.23].flatMap((a) => [
          H.clone(),
          canopyPoint(0, (0.27 - a) / 0.54)
            .applyAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2)
            .applyAxisAngle(z, wingTheta)
            .add(W),
        ]);
        s.lines.geometry.dispose();
        s.lines.geometry = new T.BufferGeometry().setFromPoints(pts);
        renderer.render(s.scene, s.camera);
        c.drawImage(renderer.domElement, x, y);
        const proj = (v: T.Vector3) => {
          const n = v.clone().project(s.camera);
          return new T.Vector2(x + (n.x + 1) * 380, y + (1 - n.y) * 345);
        };
        const local = (a: number, b: number) =>
          new T.Vector3(a, b, 0).applyQuaternion(q).add(p);
        const P = proj(p),
          HP = proj(H),
          TP = proj(local(-0.16, 0.06)),
          tail = proj(local(-0.56 - 0.12 * force, 0.06));
        c.fillStyle = "#eef6ff";
        c.font = "25px system-ui";
        c.fillText(
          i === 0
            ? "Original assumption: pitch locked"
            : "Our system: payload free to pitch",
          x + 12,
          115,
        );
        c.strokeStyle = blue;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(HP.x, HP.y, 9, 0, Math.PI * 2);
        c.stroke();
        if (i === 0) {
          c.strokeRect(HP.x - 12, HP.y - 12, 24, 24);
        }
        c.font = "18px system-ui";
        c.fillStyle = blue;
        c.fillText(
          i === 0 ? "Locked connection" : "Moving hinge",
          HP.x + 18,
          HP.y - 8,
        );
        c.fillStyle = red;
        c.beginPath();
        c.arc(P.x, P.y, 6, 0, Math.PI * 2);
        c.fill();
        c.font = "18px system-ui";
        c.fillText("Payload CG", P.x + 20, P.y + 26);
        if (i === 0) {
          const G = proj(new T.Vector3(0.08 * amount, 0.23, 0));
          c.fillStyle = "#e9c66d";
          c.beginPath();
          c.arc(G.x, G.y, 7, 0, Math.PI * 2);
          c.fill();
          c.font = "18px system-ui";
          c.fillText("Assumed combined CG", G.x + 18, G.y - 5);
        }
        if (force > 0.01) {
          arrow(tail, TP, green, "ΔT: pusher thrust");
          const O = i === 0 ? proj(new T.Vector3(0.08 * amount, 0.23, 0)) : P;
          const aa = i === 0 ? 0.7 : -0.7,
            bb = -aa;
          c.strokeStyle = green;
          c.lineWidth = 4;
          c.beginPath();
          c.arc(O.x, O.y, 54, aa, bb, i === 0);
          c.stroke();
          const tip = new T.Vector2(
            O.x + 54 * Math.cos(bb),
            O.y + 54 * Math.sin(bb),
          );
          const prev = new T.Vector2(
            O.x + 54 * Math.cos(bb + (i === 0 ? 0.1 : -0.1)),
            O.y + 54 * Math.sin(bb + (i === 0 ? 0.1 : -0.1)),
          );
          arrow(prev, tip, green);
          c.font = "19px system-ui";
          c.fillStyle = green;
          c.fillText(
            i === 0 ? "Pitch up" : "Initial pitch down",
            x + 510,
            y + 505,
          );
        }
        c.font = "22px system-ui";
        c.fillStyle = "#eef6ff";
        c.fillText(
          `Payload pitch change: ${((theta * 180) / Math.PI).toFixed(0)}°`,
          x + 18,
          860,
        );
        c.font = "20px system-ui";
        c.fillStyle = "#c1d1de";
        const texts =
          i === 0
            ? [
                "One shared pitch angle; thrust below the assumed",
                "combined CG gives a nose-up thrust moment.",
              ]
            : [
                "Thrust above the payload CG gives a nose-down",
                "thrust moment; the upper attachment surges forward.",
              ];
        texts.forEach((v, j) => c.fillText(v, x + 18, 901 + 27 * j));
      });
      c.fillStyle = "#a8bbc9";
      c.font = "18px system-ui";
      c.fillText(
        "Mechanical illustration, not a simulation trace. Geometry, motion and timing illustrative; canopy schematic. Incremental thrust shown; suspension and aerodynamic forces also act.",
        24,
        977,
      );
    }
    playback(scope, 0, 14, draw);
    document.querySelector("#status")!.textContent =
      "Mechanical illustration · scrub or change playback speed";
  }

  await main().catch(
    (e) => (document.querySelector("#status")!.textContent = String(e)),
  );
});
