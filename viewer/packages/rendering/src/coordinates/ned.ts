import { Quaternion, Vector3, Matrix4 } from "three";
// Proper rotation: NED [north,east,down] -> Three [east,up,-north].
export const worldBasis = new Quaternion().setFromRotationMatrix(
  new Matrix4().set(0, 1, 0, 0, 0, 0, -1, 0, -1, 0, 0, 0, 0, 0, 0, 1),
);
export function position(v: number[]): Vector3 {
  return new Vector3(v[1], -v[2], -v[0]);
}
export function orientation(q: number[]): Quaternion {
  return worldBasis
    .clone()
    .multiply(new Quaternion(...(q as [number, number, number, number])));
}
