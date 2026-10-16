import { MODES, type Telemetry } from "@microagu/contracts/telemetry";

type Sample = {
  time: number;
  altitude: number;
  target: number | null;
  crossTrack: number | null;
};
/** Two minutes at 4 Hz, using the simulation clock rather than arrival time. */
export class FlightPlots {
  readonly samples: Sample[] = [];
  constructor(private readonly root: HTMLElement) {
    root.querySelectorAll("svg").forEach((svg) => svg.replaceChildren());
    root.querySelectorAll(".plot-heading b").forEach((label) => {
      label.textContent = "—";
    });
  }
  record(time: number, state: Telemetry) {
    if (!Number.isFinite(time) || !Number.isFinite(state.alt)) return;
    if (this.samples.length && time < this.samples.at(-1)!.time)
      this.samples.length = 0;
    if (this.samples.length && time - this.samples.at(-1)!.time < 0.25) return;
    const navigation = [MODES.AUTO, MODES.LOITER, MODES.CRUISE].includes(
      state.mode,
    );
    const heightControl = navigation || state.mode === MODES.FBWB;
    const finite = (v: number | null) =>
      v !== null && Number.isFinite(v) ? v : null;
    this.samples.push({
      time,
      altitude: state.alt,
      target: heightControl ? finite(state.targetAlt) : null,
      crossTrack: navigation ? finite(state.crossTrack) : null,
    });
    while (this.samples.length > 481 || this.samples[0].time < time - 120)
      this.samples.shift();
    this.draw();
  }
  draw() {
    if (this.root.hidden) return;
    const latest = this.samples.at(-1);
    if (!latest) return;
    this.root.querySelector("#plot-alt")!.textContent =
      `${latest.altitude.toFixed(1)} m`;
    this.root.querySelector("#plot-xtrack")!.textContent =
      latest.crossTrack === null ? "—" : `${latest.crossTrack.toFixed(1)} m`;
    this.chart("alt-plot", ["altitude", "target"], latest.time, false);
    this.chart("xtrack-plot", ["crossTrack"], latest.time, true);
  }
  private chart(
    id: string,
    keys: ("altitude" | "target" | "crossTrack")[],
    now: number,
    signed: boolean,
  ) {
    const values = this.samples
      .flatMap((s) => keys.map((k) => s[k]))
      .filter((v): v is number => v !== null);
    const extent = Math.max(5, ...values.map(Math.abs));
    const low = signed
      ? -Math.ceil(extent / 5) * 5
      : Math.floor(Math.min(0, ...values) / 10) * 10;
    const high = signed
      ? -low
      : Math.max(low + 10, Math.ceil(Math.max(0, ...values) / 10) * 10);
    const y = (v: number) => 53 - ((v - low) / (high - low)) * 46;
    const paths = keys
      .map((key, i) => {
        let connected = false;
        const d = this.samples
          .map((s) => {
            const value = s[key];
            if (value === null) {
              connected = false;
              return "";
            }
            const point = `${connected ? "L" : "M"}${(32 + ((s.time - now + 120) / 120) * 264).toFixed(1)},${y(value).toFixed(1)}`;
            connected = true;
            return point;
          })
          .join(" ");
        return `<path d="${d}" class="${i ? "plot-target" : "plot-actual"}"/>`;
      })
      .join("");
    this.root.querySelector(`#${id}`)!.innerHTML =
      `<path d="M32 7H296M32 ${signed ? y(0) : 53}H296" class="plot-grid"/><text x="0" y="11">${high}</text><text x="0" y="56">${low}</text>${signed ? '<text x="0" y="33">0</text>' : ""}${paths}`;
  }
}
