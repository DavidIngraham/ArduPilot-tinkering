import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ManagedRenderer } from "@microagu/rendering/scene/resources";
import { comparisonScene } from "@microagu/rendering/scene/comparison";
import { ModelAssets } from "@microagu/rendering/assets/models";
import { Scope } from "../shell/scope";
export async function comparisonLayout(
  scope: Scope,
  assets: ModelAssets,
  host: HTMLElement,
  height: number,
) {
  const canvas = scope.node(document.createElement("canvas"));
  canvas.width = 1280;
  canvas.height = height;
  host.append(canvas);
  const ctx = canvas.getContext("2d")!;
  const renderer = scope.own(new ManagedRenderer({ antialias: true }));
  renderer.setSize(1280, 500);
  const camera = new T.PerspectiveCamera(40, 1, 0.01, 2000);
  camera.position.set(4, 2, 5);
  const orbit = scope.own(new OrbitControls(camera, canvas));
  orbit.target.set(0, 0.5, 0);
  orbit.enablePan = false;
  orbit.minDistance = 2;
  orbit.maxDistance = 15;
  orbit.update();
  const model = await assets.load("models/microagu-payload-tl.glb");
  const views = [0x58a7d0, 0x70c6ad].map((color) => {
    const view = comparisonScene(model.scene, color);
    scope.own(view.scene);
    return {
      ...view,
      rows: [] as number[][],
      phases: [] as number[],
      distance: [] as number[],
      current: [] as number[],
    };
  });
  return { canvas, ctx, renderer, camera, orbit, views };
}
