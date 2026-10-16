export const MODES: Record<string, number> = {
  MANUAL: 0,
  FBWA: 5,
  CRUISE: 7,
  AUTO: 10,
  LOITER: 12,
  TAKEOFF: 13,
};
export interface Telemetry {
  mode: number;
  armed: boolean;
  lat: number;
  lon: number;
  alt: number;
  speed: number;
  climb: number;
  roll: number;
  pitch: number;
  yaw: number;
  servos: number[];
  mission: number;
  lastHeartbeat: number;
}

export function initialTelemetry(home: {
  lat: number;
  lon: number;
}): Telemetry {
  return {
    mode: -1,
    armed: false,
    lat: home.lat,
    lon: home.lon,
    alt: 0,
    speed: 0,
    climb: 0,
    roll: 0,
    pitch: 0,
    yaw: 0,
    servos: [],
    mission: 0,
    lastHeartbeat: 0,
  };
}
