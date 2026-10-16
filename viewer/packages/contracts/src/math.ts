/** Small double-precision attitude helpers for data adapters; no renderer dependency. */
export class Vector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}
  fromArray(a: number[], i = 0) {
    [this.x, this.y, this.z] = a.slice(i, i + 3);
    return this;
  }
  toArray() {
    return [this.x, this.y, this.z];
  }
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
  add(v: Vector3) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  sub(v: Vector3) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  divideScalar(s: number) {
    this.x /= s;
    this.y /= s;
    this.z /= s;
    return this;
  }
  lerp(v: Vector3, t: number) {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }
  cross(v: Vector3) {
    const { x, y, z } = this;
    this.x = y * v.z - z * v.y;
    this.y = z * v.x - x * v.z;
    this.z = x * v.y - y * v.x;
    return this;
  }
  applyQuaternion(q: Quaternion) {
    const tx = 2 * (q.y * this.z - q.z * this.y),
      ty = 2 * (q.z * this.x - q.x * this.z),
      tz = 2 * (q.x * this.y - q.y * this.x);
    this.x += q.w * tx + q.y * tz - q.z * ty;
    this.y += q.w * ty + q.z * tx - q.x * tz;
    this.z += q.w * tz + q.x * ty - q.y * tx;
    return this;
  }
}
export class Quaternion {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
    public w = 1,
  ) {}
  fromArray(a: number[], i = 0) {
    [this.x, this.y, this.z, this.w] = a.slice(i, i + 4);
    return this;
  }
  toArray() {
    return [this.x, this.y, this.z, this.w];
  }
  clone() {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }
  normalize() {
    const n = Math.hypot(this.x, this.y, this.z, this.w);
    if (!n) throw Error("Zero quaternion");
    this.x /= n;
    this.y /= n;
    this.z /= n;
    this.w /= n;
    return this;
  }
  invert() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }
  multiply(q: Quaternion) {
    const { x, y, z, w } = this;
    this.x = w * q.x + x * q.w + y * q.z - z * q.y;
    this.y = w * q.y - x * q.z + y * q.w + z * q.x;
    this.z = w * q.z + x * q.y - y * q.x + z * q.w;
    this.w = w * q.w - x * q.x - y * q.y - z * q.z;
    return this;
  }
  slerp(q: Quaternion, t: number) {
    let b = q.toArray(),
      a = this.toArray(),
      dot = a.reduce((s, v, i) => s + v * b[i], 0);
    if (dot < 0) {
      b = b.map((v) => -v);
      dot = -dot;
    }
    if (dot > 0.9995)
      return this.fromArray(a.map((v, i) => v + t * (b[i] - v))).normalize();
    const angle = Math.acos(Math.min(1, dot)),
      s = Math.sin(angle);
    return this.fromArray(
      a.map(
        (v, i) =>
          (v * Math.sin((1 - t) * angle) + b[i] * Math.sin(t * angle)) / s,
      ),
    );
  }
}
