import { Scope } from "../shell/scope";
export type StickShape = "circle" | "line" | "semicircle";
export function constrainStick(
  x: number,
  y: number,
  shape: StickShape,
): [number, number] {
  if (shape === "line") return [Math.max(-1, Math.min(1, x)), 0];
  if (shape === "semicircle") y = Math.max(0, y);
  const radius = Math.max(1, Math.hypot(x, y));
  return [x / radius, y / radius];
}
/** One captured touch/pointer, circular travel, and deterministic release-to-center. */
export function joystick(
  scope: Scope,
  host: HTMLElement,
  enabled: () => boolean,
  change: (x: number, y: number) => void,
  shape: () => StickShape = () => "circle",
) {
  let pointer: number | null = null;
  const reset = () => {
    const old = pointer;
    pointer = null;
    if (old !== null && host.hasPointerCapture(old))
      host.releasePointerCapture(old);
    change(0, 0);
  };
  function move(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    const box = host.getBoundingClientRect();
    const form = shape();
    const x = (event.clientX - box.left - box.width / 2) / 52;
    const y =
      (event.clientY -
        box.top -
        (form === "semicircle" ? 29 : box.height / 2)) /
      52;
    change(...constrainStick(x, y, form));
  }
  scope.listen(host, "pointerdown", (event) => {
    if (!enabled() || pointer !== null) return;
    pointer = event.pointerId;
    host.setPointerCapture(pointer);
    move(event);
  });
  scope.listen(host, "pointermove", move);
  for (const event of [
    "pointerup",
    "pointercancel",
    "lostpointercapture",
  ] as const)
    scope.listen(host, event, (e) => {
      if (e.pointerId === pointer) reset();
    });
  scope.defer(() => {
    const old = pointer;
    pointer = null;
    if (old !== null && host.hasPointerCapture(old))
      host.releasePointerCapture(old);
  });
  return { reset };
}
