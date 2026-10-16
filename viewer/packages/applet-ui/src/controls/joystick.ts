import { Scope } from "../shell/scope";
/** One captured touch/pointer, circular travel, and deterministic release-to-center. */
export function joystick(
  scope: Scope,
  host: HTMLElement,
  enabled: () => boolean,
  change: (x: number, y: number) => void,
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
    let x = (event.clientX - box.left - box.width / 2) / (box.width * 0.32),
      y = (event.clientY - box.top - box.height / 2) / (box.height * 0.32);
    const radius = Math.max(1, Math.hypot(x, y));
    x /= radius;
    y /= radius;
    change(x, y);
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
