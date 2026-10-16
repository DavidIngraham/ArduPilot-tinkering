/** Ownership of all resources created by a mounted applet. Disposal is idempotent. */
export class Scope {
  private cleanups = new Set<() => void>();
  private controller = new AbortController();
  readonly signal = this.controller.signal;
  get disposed() {
    return this.signal.aborted;
  }
  get resourceCount() {
    return this.cleanups.size;
  }
  defer(cleanup: () => void) {
    if (this.disposed) cleanup();
    else this.cleanups.add(cleanup);
    return () => {
      this.cleanups.delete(cleanup);
      cleanup();
    };
  }
  own<T extends { dispose(): void }>(value: T): T {
    this.defer(() => value.dispose());
    return value;
  }
  worker<T extends Worker>(worker: T): T {
    this.defer(() => worker.terminate());
    return worker;
  }
  socket(socket: WebSocket) {
    this.defer(() => socket.close());
    return socket;
  }
  recorder(recorder: MediaRecorder) {
    this.defer(() => {
      if (recorder.state !== "inactive") recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });
    return recorder;
  }
  observer<T extends ResizeObserver>(observer: T): T {
    this.defer(() => observer.disconnect());
    return observer;
  }
  node<T extends Node>(node: T): T {
    this.defer(() => node.parentNode?.removeChild(node));
    return node;
  }
  objectURL(value: Blob | MediaSource) {
    const url = URL.createObjectURL(value);
    this.defer(() => URL.revokeObjectURL(url));
    return url;
  }
  listen<K extends keyof WindowEventMap>(
    target: Window,
    event: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  listen<K extends keyof DocumentEventMap>(
    target: Document,
    event: K,
    listener: (event: DocumentEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  listen<K extends keyof HTMLElementEventMap>(
    target: Element,
    event: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  listen(
    target: EventTarget,
    event: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  listen(
    target: EventTarget,
    event: string,
    listener: any,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (this.disposed) return;
    target.addEventListener(event, listener, options);
    this.defer(() => target.removeEventListener(event, listener, options));
  }
  property<T, K extends keyof T>(target: T, key: K, value: T[K]) {
    const old = target[key];
    target[key] = value;
    this.defer(() => {
      target[key] = old;
    });
    return value;
  }
  requestFrame(callback: FrameRequestCallback) {
    if (this.disposed) return 0;
    const id = requestAnimationFrame((time) => {
      this.cleanups.delete(cancel);
      if (!this.disposed) callback(time);
    });
    const cancel = () => cancelAnimationFrame(id);
    this.defer(cancel);
    return id;
  }
  interval(callback: () => void, ms: number) {
    const id = setInterval(() => {
      if (!this.disposed) callback();
    }, ms);
    this.defer(() => clearInterval(id));
    return id;
  }
  timeout(callback: () => void, ms: number) {
    const id = setTimeout(() => {
      this.cleanups.delete(cancel);
      if (!this.disposed) callback();
    }, ms);
    const cancel = () => clearTimeout(id);
    this.defer(cancel);
    return id;
  }
  async fetch(input: RequestInfo | URL, init?: RequestInit) {
    const response = await fetch(input, { ...init, signal: this.signal });
    this.signal.throwIfAborted();
    return response;
  }
  dispose() {
    if (this.disposed) return;
    this.controller.abort();
    const errors: unknown[] = [];
    for (const cleanup of [...this.cleanups].reverse())
      try {
        cleanup();
      } catch (e) {
        errors.push(e);
      }
    this.cleanups.clear();
    if (errors.length) console.error("Resource disposal failed", errors);
  }
}
