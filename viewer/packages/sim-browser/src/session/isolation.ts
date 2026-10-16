/** GitHub Pages isolation setup belongs to the browser host, not the UI or renderer. */
export async function ensureIsolation(
  baseURL: string,
  signal: AbortSignal,
): Promise<boolean> {
  if (crossOriginIsolated) {
    sessionStorage.removeItem("microagu-isolation-reload");
    return true;
  }
  if (!("serviceWorker" in navigator) || !isSecureContext)
    throw Error(
      "Shared memory requires HTTPS (or localhost) and service workers.",
    );
  await navigator.serviceWorker.register(new URL("simulator-sw.js", baseURL), {
    scope: "./",
  });
  await navigator.serviceWorker.ready;
  signal.throwIfAborted();
  if (!navigator.serviceWorker.controller)
    await new Promise<void>((resolve, reject) => {
      function cleanup() {
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          changed,
        );
        signal.removeEventListener("abort", abort);
      }
      function changed() {
        cleanup();
        resolve();
      }
      function abort() {
        cleanup();
        reject(signal.reason);
      }
      const timer = setTimeout(() => {
        cleanup();
        reject(Error("Shared-memory setup timed out. Reload to try again."));
      }, 10000);
      navigator.serviceWorker.addEventListener("controllerchange", changed);
      signal.addEventListener("abort", abort, { once: true });
    });
  signal.throwIfAborted();
  if (sessionStorage.getItem("microagu-isolation-reload"))
    throw Error(
      "Shared memory is unavailable. Close other site tabs, reload, or try a browser with cross-origin isolation support.",
    );
  sessionStorage.setItem("microagu-isolation-reload", "1");
  location.reload();
  return false;
}
