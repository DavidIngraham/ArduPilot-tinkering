import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  canopyGeometry,
  canopyMaterial,
  poseCanopyBrakes,
  updateSuspension,
} from "../paraglider";
import { rigPayload, poseMechanisms, type Mechanisms } from "../mechanisms";
import { position, orientation, type Frame } from "../state";
import { TruthBuffer } from "./truth-buffer";
import { RotorPhase } from "../mechanisms";
import { HOME, offset, type Waypoint } from "./mission";
export class FlightView {
  private scene = new T.Scene();
  private renderer = new T.WebGLRenderer({ antialias: true });
  private camera = new T.PerspectiveCamera(48, 1, 0.05, 10000);
  private orbit: OrbitControls;
  private payload = new T.Group();
  private canopy = new T.Group();
  private lines = new T.LineSegments(
    new T.BufferGeometry(),
    new T.LineBasicMaterial({ color: 0xd6ddd0 }),
  );
  private route = new T.Line(
    new T.BufferGeometry(),
    new T.LineBasicMaterial({
      color: 0xb7ee75,
      transparent: true,
      opacity: 0.75,
    }),
  );
  private mechanisms: Mechanisms | null = null;
  private phase = 0;
  private truth = new TruthBuffer();
  private rotor = new RotorPhase();
  private last = performance.now();
  private lastTarget = new T.Vector3();
  private mode = 0;
  private first = true;
  constructor(host: HTMLElement, log: (s: string) => void) {
    host.append(this.renderer.domElement);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.scene.background = new T.Color("#91b4bf");
    this.scene.fog = new T.Fog("#91b4bf", 700, 3500);
    this.scene.add(new T.HemisphereLight(0xe1f2ff, 0x5d6742, 2.6));
    const sun = new T.DirectionalLight(0xffedc4, 3);
    sun.position.set(-100, 300, 100);
    this.scene.add(sun);
    const ground = new T.Mesh(
      new T.PlaneGeometry(8000, 8000),
      new T.MeshStandardMaterial({ color: 0x6e8363, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    this.scene.add(ground);
    const grid = new T.GridHelper(2000, 80, 0x9fa68b, 0x819575);
    grid.position.y = -0.1;
    this.scene.add(grid);
    // Deterministic distant tree line, leaving the launch area open.
    const treeGeo = new T.ConeGeometry(7, 25, 6),
      treeMat = new T.MeshStandardMaterial({ color: 0x435f50 });
    for (let i = 0; i < 100; i++) {
      const angle = i * 2.39996,
        r = 450 + (i % 13) * 34;
      const tree = new T.Mesh(treeGeo, treeMat);
      tree.position.set(Math.sin(angle) * r, 12, Math.cos(angle) * r);
      this.scene.add(tree);
    }
    const pad = new T.Mesh(
      new T.CircleGeometry(12, 40),
      new T.MeshStandardMaterial({ color: 0xafa98a }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = -0.05;
    this.scene.add(pad);
    this.payload.add(
      new T.Mesh(
        new T.BoxGeometry(0.18, 0.18, 0.25),
        new T.MeshStandardMaterial({ color: 0xdfddd2 }),
      ),
    );
    this.canopy.add(new T.Mesh(canopyGeometry(), canopyMaterial()));
    this.scene.add(this.payload, this.canopy, this.lines, this.route);
    new GLTFLoader()
      .loadAsync(
        new URL("models/microagu-payload-tl.glb", document.baseURI).href,
      )
      .then((g) => {
        this.payload.clear();
        this.payload.add(g.scene);
        this.mechanisms = rigPayload(g.scene);
      })
      .catch((e) => log(`CAD model could not load: ${e.message}`));
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.maxDistance = 1000;
    this.orbit.minDistance = 1;
    new ResizeObserver(() => {
      this.renderer.setSize(host.clientWidth, host.clientHeight);
      this.camera.aspect = host.clientWidth / host.clientHeight;
      this.camera.updateProjectionMatrix();
    }).observe(host);
    this.renderer.setAnimationLoop(() => this.draw());
  }
  updateTruth(frame: Frame) {
    this.truth.push(frame, performance.now() / 1000);
  }
  cycle() {
    this.mode = (this.mode + 1) % 3;
    this.first = true;
    return ["chase", "orbit", "ground"][this.mode];
  }
  mission(items: Waypoint[]) {
    const points = items
      .filter((w) => w.command !== 20)
      .map((w) => {
        const p = offset(w.lat, w.lon);
        return new T.Vector3(
          p.east,
          w.frame === 3 ? w.alt : w.alt - HOME.alt,
          -p.north,
        );
      });
    this.route.geometry.dispose();
    this.route.geometry = new T.BufferGeometry().setFromPoints(points);
  }
  private draw() {
    const now = performance.now(),
      dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const f = this.truth.advance(dt);
    if (!f) return;
    {
      this.payload.position.copy(position(f.state.slice(0, 3)));
      this.payload.quaternion.copy(orientation(f.state.slice(3, 7)));
      this.canopy.position.copy(position(f.state.slice(13, 16)));
      this.canopy.quaternion.copy(orientation(f.state.slice(16, 20)));
      const brakes = f.brake_mm;
      this.phase = this.rotor.advance(f.time_s, f.rpm);
      if (this.mechanisms)
        poseMechanisms(this.mechanisms, this.phase, brakes, [0, 0]);
      poseCanopyBrakes(this.canopy, brakes);
      updateSuspension(
        this.lines,
        this.payload,
        this.canopy,
        {},
        0.066,
        undefined,
        brakes,
      );
    }
    const target = this.payload.position.clone().add(new T.Vector3(0, 0.7, 0));
    if (this.first) {
      this.camera.position
        .copy(target)
        .add(
          this.mode === 2
            ? new T.Vector3(30, 4 - target.y, 25)
            : new T.Vector3(5, 3.5, 9),
        );
      this.orbit.target.copy(target);
      this.lastTarget.copy(target);
      this.first = false;
    }
    if (this.mode === 0) {
      const forward = new T.Vector3(1, 0, 0).applyQuaternion(
        this.payload.quaternion,
      );
      forward.y = 0;
      const desired = forward
        .normalize()
        .multiplyScalar(-9)
        .add(new T.Vector3(0, 3, 0));
      // Translate with the same sampled aircraft pose; only damp the offset.
      this.camera.position.add(target.clone().sub(this.lastTarget));
      this.camera.position.lerp(
        target.clone().add(desired),
        1 - Math.exp(-dt * 3),
      );
      this.orbit.target.copy(target);
    } else if (this.mode === 1) {
      this.camera.position.add(target.clone().sub(this.lastTarget));
      this.orbit.target.copy(target);
    } else this.orbit.target.copy(target);
    this.lastTarget.copy(target);
    this.orbit.enabled = this.mode === 1;
    if (this.mode === 1) this.orbit.update();
    else this.camera.lookAt(target);
    this.renderer.render(this.scene, this.camera);
  }
}
