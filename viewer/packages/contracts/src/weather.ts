export interface Weather {
  /** Horizontal gust RMS in m/s; vertical RMS is half this value. */
  turbulence: number;
  /** Upward speed at the centre of a ground-fixed Gaussian thermal. */
  thermalStrength: number;
  thermalRadius: number;
  thermalNorth: number;
  thermalEast: number;
}
export const calmWeather: Weather = {
  turbulence: 0,
  thermalStrength: 0,
  thermalRadius: 40,
  thermalNorth: 0,
  thermalEast: 0,
};
