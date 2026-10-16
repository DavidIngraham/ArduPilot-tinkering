/** Native transport for deterministic recorded-state and explanatory applets. */
import { Scope } from "../shell/scope";
export function playback(
  scope: Scope,
  start: number,
  end: number,
  draw: (time: number) => void,
) {
  const host = document.querySelector<HTMLElement>("#transport")!;
  host.innerHTML =
    '<button id="play">Pause</button> <button id="restart">Restart</button> <label>Speed <select id="speed"><option value=".25">¼×</option><option value=".5">½×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label> <input id="time" aria-label="Playback time" type="range" step=".01"> <output id="clock"></output>';
  const slider = host.querySelector<HTMLInputElement>("#time")!,
    button = host.querySelector<HTMLButtonElement>("#play")!,
    speed = host.querySelector<HTMLSelectElement>("#speed")!;
  slider.min = String(start);
  slider.max = String(end);
  let time = start,
    playing = true,
    last = performance.now();
  scope.property(button, "onclick", () => {
    playing = !playing;
    button.textContent = playing ? "Pause" : "Play";
  });
  scope.property(
    host.querySelector<HTMLButtonElement>("#restart")!,
    "onclick",
    () => {
      time = start;
      playing = true;
      button.textContent = "Pause";
    },
  );
  scope.property(slider, "oninput", () => {
    time = Number(slider.value);
    playing = false;
    button.textContent = "Play";
  });
  function tick(now: number) {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (playing && !document.hidden)
      time =
        start + ((time - start + dt * Number(speed.value)) % (end - start));
    slider.value = String(time);
    host.querySelector("output")!.textContent =
      `${(time - start).toFixed(1)} / ${(end - start).toFixed(1)} s`;
    draw(time);
    scope.requestFrame(tick);
  }
  scope.requestFrame(tick);
  return {
    seek: (t: number) => {
      time = Math.max(start, Math.min(end, t));
    },
  };
}
