import * as T from "three";

export function disposeTree(root: T.Object3D) {
  const resources = new Set<{ dispose(): void }>();
  root.traverse((object) => {
    const mesh = object as T.Mesh;
    if (mesh.geometry) resources.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      if (!material) continue;
      resources.add(material);
      for (const value of Object.values(material))
        if (value instanceof T.Texture) resources.add(value);
    }
  });
  resources.forEach((r) => r.dispose());
  root.clear();
}
export class ManagedScene extends T.Scene {
  dispose() {
    disposeTree(this);
  }
}
export class ManagedRenderer extends T.WebGLRenderer {
  constructor(options?: T.WebGLRendererParameters) {
    super(options);
    // Three installs dispose as an instance function, so wrap that function.
    const release = this.dispose.bind(this);
    this.dispose = () => {
      this.setAnimationLoop(null);
      release();
      this.forceContextLoss();
      this.domElement.remove();
    };
  }
}
