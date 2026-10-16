import type { Waypoint } from "@microagu/contracts/mission";
export const HOME = { lat: 45.997, lon: -121.536, alt: 600 };
export function exampleMission(): Waypoint[] {
  return [
    [200, 0],
    [400, 0],
    [400, 200],
    [0, 200],
    [0, 0],
  ].map(([n, e], i) => ({
    command: i === 4 ? 17 : 16,
    frame: 3,
    params: [0, 22, i === 4 ? 35 : 0, 0],
    lat: HOME.lat + n / 111319.49,
    lon: HOME.lon + e / (111319.49 * Math.cos((HOME.lat * Math.PI) / 180)),
    alt: 60,
  }));
}
