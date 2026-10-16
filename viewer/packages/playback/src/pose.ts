import type { Frame } from "@microagu/contracts/recordings";
import type { FlightFrame } from "@microagu/contracts/flight";
import type { RenderPose } from "@microagu/contracts/pose";
export function truthPose(frame: Frame): RenderPose {
  return {
    time_s: frame.time_s,
    payload: {
      position: frame.state.slice(0, 3),
      quaternion: frame.state.slice(3, 7),
    },
    canopy: {
      position: frame.state.slice(13, 16),
      quaternion: frame.state.slice(16, 20),
    },
    rpm: frame.rpm,
    brake_mm: frame.brake_mm,
    inflation: frame.inflation ?? null,
  };
}
export function flightPose(frame: FlightFrame): RenderPose {
  return {
    time_s: frame.t,
    payload: { position: frame.p, quaternion: frame.q },
    canopy: null,
    rpm: null,
    brake_mm: null,
    inflation: null,
  };
}
