import { Scope } from "./scope";
import type { AppletDefinition } from "@microagu/contracts/applet";

export function registerApplet(
  definition: AppletDefinition,
  factory: (scope: Scope) => unknown,
) {
  const original = document.body.innerHTML;
  let scope: Scope | null = null;
  const handle = {
    definition,
    get resources() {
      return scope?.resourceCount ?? 0;
    },
    dispose() {
      scope?.dispose();
      scope = null;
    },
    async mount() {
      handle.dispose();
      document.body.innerHTML = original;
      const current = (scope = new Scope());
      try {
        await factory(current);
      } catch (error) {
        if (current.disposed) return;
        current.dispose();
        const output = document.querySelector("#error, #status");
        if (output) output.textContent = String(error);
        throw error;
      }
    },
  };
  window.addEventListener("pagehide", () => handle.dispose());
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) void handle.mount().catch(console.error);
  });
  (window as unknown as { microaguApplet: typeof handle }).microaguApplet =
    handle;
  void handle.mount().catch(console.error);
  return handle;
}
