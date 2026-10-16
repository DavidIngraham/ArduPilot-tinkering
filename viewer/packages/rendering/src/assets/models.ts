import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { disposeTree } from "../scene/resources";

/** Per-mount cache. Instances have independent transforms; GPU assets live until disposal. */
export class ModelAssets {
  private cache = new Map<string, Promise<GLTF>>();
  private disposed = false;
  constructor(private signal: AbortSignal) {}
  async parse(buffer: ArrayBuffer) {
    const asset = await new GLTFLoader().parseAsync(buffer, "");
    if (this.disposed || this.signal.aborted) {
      disposeTree(asset.scene);
      throw new DOMException("Unmounted", "AbortError");
    }
    this.cache.set(`upload:${this.cache.size}`, Promise.resolve(asset));
    return asset;
  }
  async load(url: string): Promise<GLTF> {
    this.signal.throwIfAborted();
    if (!this.cache.has(url))
      this.cache.set(
        url,
        new GLTFLoader().loadAsync(url).then((asset) => {
          if (this.disposed || this.signal.aborted) {
            disposeTree(asset.scene);
            throw new DOMException("Unmounted", "AbortError");
          }
          return asset;
        }),
      );
    const asset = await this.cache.get(url)!;
    this.signal.throwIfAborted();
    return { ...asset, scene: asset.scene.clone(true) };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const asset of this.cache.values())
      void asset.then((a) => disposeTree(a.scene)).catch(() => {});
    this.cache.clear();
  }
}
