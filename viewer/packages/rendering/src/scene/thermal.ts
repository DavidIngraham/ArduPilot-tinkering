import * as T from "three";
import type { Weather } from "@microagu/contracts/weather";
import { position } from "../coordinates/ned";

function risingBands() {
  const pixels = new Uint8Array(64 * 4);
  for (let i = 0; i < 64; i++) {
    const alpha =
      25 + 230 * Math.pow(0.5 + 0.5 * Math.cos((i * Math.PI) / 32), 6);
    pixels.set([255, alpha, 255, 255], i * 4);
  }
  const texture = new T.DataTexture(pixels, 1, 64);
  texture.wrapT = T.RepeatWrapping;
  texture.magFilter = texture.minFilter = T.LinearFilter;
  texture.repeat.y = 200 / 12;
  texture.needsUpdate = true;
  return texture;
}

/** Illustrative thermal extent and rising tracers, driven by simulation time. */
export class ThermalColumn extends T.Group {
  private readonly height = 200;
  private readonly tracerCount = 160;
  private strength = 0;
  private radius = 40;
  private bands = risingBands();
  private shell = new T.Mesh(
    new T.CylinderGeometry(1, 1, 1, 64, 1, true),
    new T.MeshBasicMaterial({
      color: 0xff3030,
      transparent: true,
      opacity: 0.22,
      alphaMap: this.bands,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  private tracers = new T.InstancedMesh(
    new T.ConeGeometry(0.25, 1.3, 6),
    new T.MeshBasicMaterial({
      color: 0xff4840,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
    this.tracerCount,
  );
  private dummy = new T.Object3D();

  constructor() {
    super();
    this.name = "thermal-column";
    this.visible = false;
    this.shell.position.y = this.height / 2;
    this.tracers.instanceMatrix.setUsage(T.DynamicDrawUsage);
    // Positions animate throughout the column; don't use stale instance bounds.
    this.tracers.frustumCulled = false;
    this.add(this.shell, this.tracers);
  }

  configure(
    weather: Pick<
      Weather,
      "thermalStrength" | "thermalRadius" | "thermalNorth" | "thermalEast"
    >,
  ) {
    this.strength = weather.thermalStrength;
    this.radius = weather.thermalRadius;
    this.visible = this.strength > 0;
    this.position.copy(
      position([weather.thermalNorth, weather.thermalEast, 0]),
    );
    this.shell.scale.set(this.radius, this.height, this.radius);
  }

  update(time: number) {
    if (!this.visible) return;
    this.bands.offset.y = -(time * (2 + 3 * this.strength)) / 12;
    for (let i = 0; i < this.tracerCount; i++) {
      const radius = this.radius * Math.sqrt((i + 0.5) / this.tracerCount);
      const angle = i * 2.399963 + time * 0.035;
      // Display motion is exaggerated so weak lift remains readable on a phone.
      const speed =
        2 + 3 * this.strength * Math.exp(-((radius / this.radius) ** 2));
      const height =
        ((i * this.height) / this.tracerCount + time * speed) % this.height;
      const fade = Math.max(
        0,
        Math.min(1, height / 8, (this.height - height) / 16),
      );
      this.dummy.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius,
      );
      this.dummy.scale.setScalar(
        fade * Math.max(0.7, Math.min(2, this.radius / 40)),
      );
      this.dummy.updateMatrix();
      this.tracers.setMatrixAt(i, this.dummy.matrix);
    }
    this.tracers.instanceMatrix.needsUpdate = true;
  }
}
