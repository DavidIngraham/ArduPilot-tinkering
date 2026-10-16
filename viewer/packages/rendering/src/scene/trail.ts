import * as T from "three";
import { position } from "../coordinates/ned";

/** Bounded history with duplicated ring storage so the line never joins newest to oldest. */
export class FlightTrail extends T.Line {
  private readonly capacity: number;
  private next = 0;
  private samples = 0;
  private lastTime = -Infinity;
  private lastPoint = new T.Vector3(Infinity, Infinity, Infinity);

  constructor(capacity = 4096) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.BufferAttribute(new Float32Array(capacity * 6), 3).setUsage(
        T.DynamicDrawUsage,
      ),
    );
    geometry.setDrawRange(0, 0);
    super(
      geometry,
      new T.LineBasicMaterial({
        color: 0xf7d898,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    this.capacity = capacity;
    this.visible = false;
    this.frustumCulled = false;
  }

  record(time: number, ned: number[]) {
    if (time < this.lastTime) this.clearHistory();
    if (time - this.lastTime < 0.25) return;
    const point = position(ned);
    if (point.distanceToSquared(this.lastPoint) < 0.25) return;
    const attribute = this.geometry.getAttribute(
      "position",
    ) as T.BufferAttribute;
    for (const index of [this.next, this.next + this.capacity])
      attribute.setXYZ(index, point.x, point.y, point.z);
    this.next = (this.next + 1) % this.capacity;
    this.samples = Math.min(this.capacity, this.samples + 1);
    this.geometry.setDrawRange(
      this.samples === this.capacity ? this.next : 0,
      this.samples,
    );
    attribute.needsUpdate = true;
    this.lastPoint.copy(point);
    this.lastTime = time;
  }

  clearHistory() {
    this.next = this.samples = 0;
    this.lastTime = -Infinity;
    this.lastPoint.set(Infinity, Infinity, Infinity);
    this.geometry.setDrawRange(0, 0);
  }
}
