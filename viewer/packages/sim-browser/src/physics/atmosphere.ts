import { calmWeather, type Weather } from "@microagu/contracts/weather";

/** Synthetic training weather, independent of the aircraft's fitted coefficients. */
export class Atmosphere {
  private mean = [0, 0, 0];
  private weather: Weather = { ...calmWeather };
  private gust = [0, 0, 0];
  private seed = 0x4d414755;

  configure(speed: number, from: number, up: number, weather = calmWeather) {
    const ranges = [
      [speed, 0, 10],
      [from, 0, 360],
      [up, -3, 3],
      [weather.turbulence, 0, 2],
      [weather.thermalStrength, 0, 5],
      [weather.thermalRadius, 5, 200],
      [weather.thermalNorth, -1000, 1000],
      [weather.thermalEast, -1000, 1000],
    ];
    if (
      ranges.some(([v, min, max]) => !Number.isFinite(v) || v < min || v > max)
    )
      throw Error("Weather settings are outside their supported ranges.");
    const angle = (from * Math.PI) / 180;
    this.mean = [-speed * Math.cos(angle), -speed * Math.sin(angle), -up];
    this.weather = { ...weather };
    if (weather.turbulence === 0) this.gust.fill(0);
  }

  private uniform() {
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x >>> 0;
    return (this.seed + 0.5) / 4294967296;
  }

  sample(dt: number, north: number, east: number): number[] {
    const w = this.weather;
    // Exact Ornstein–Uhlenbeck transition, two-second correlation time.
    const decay = Math.exp(-dt / 2);
    if (w.turbulence > 0 && dt > 0) {
      for (let axis = 0; axis < 3; axis++) {
        const normal =
          Math.sqrt(-2 * Math.log(this.uniform())) *
          Math.cos(2 * Math.PI * this.uniform());
        this.gust[axis] =
          decay * this.gust[axis] + Math.sqrt(1 - decay * decay) * normal;
      }
    }
    const radius2 =
      ((north - w.thermalNorth) ** 2 + (east - w.thermalEast) ** 2) /
      w.thermalRadius ** 2;
    const lift = w.thermalStrength * Math.exp(-radius2);
    return this.mean.map(
      (v, axis) =>
        v +
        w.turbulence * this.gust[axis] * (axis === 2 ? 0.5 : 1) -
        (axis === 2 ? lift : 0),
    );
  }
}
