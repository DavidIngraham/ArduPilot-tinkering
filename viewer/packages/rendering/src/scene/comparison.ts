import * as T from "three";
import { ManagedScene } from "./resources";
import { rigPayload } from "../aircraft/mechanisms";
import { canopyGeometry, canopyMaterial } from "../aircraft/paraglider";
/** Shared physical-scale aircraft scene; callers own annotations and experiment data. */
export function comparisonScene(model: T.Object3D, color: number) {
  const scene = new ManagedScene();
  scene.background = new T.Color("#142735");
  scene.add(new T.HemisphereLight(0xe6f8ff, 0x566473, 3));
  const light = new T.DirectionalLight(0xffffff, 3);
  light.position.set(3, 8, 4);
  scene.add(light);
  const body = model.clone(true);
  scene.add(body);
  const rig = rigPayload(body);
  const wing = new T.Mesh(canopyGeometry(), canopyMaterial());
  scene.add(wing);
  const lines = new T.LineSegments(
    new T.BufferGeometry(),
    new T.LineBasicMaterial({ color: 0xc8d7e2 }),
  );
  scene.add(lines);
  const grid = new T.GridHelper(1000, 1000, 0x506b7b, 0x304958);
  grid.position.y = -3;
  scene.add(grid);
  const path = new T.Line(
    new T.BufferGeometry(),
    new T.LineBasicMaterial({ color, transparent: true, opacity: 0.25 }),
  );
  scene.add(path);
  const trail = new T.Line(
    new T.BufferGeometry(),
    new T.LineBasicMaterial({ color }),
  );
  scene.add(trail);
  return { scene, body, rig, wing, lines, grid, path, trail };
}
