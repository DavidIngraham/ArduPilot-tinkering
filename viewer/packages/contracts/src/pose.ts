/** NED position and body-to-world xyzw attitude. Unknown bodies remain absent. */
export interface BodyPose {
  position: number[];
  quaternion: number[];
}
export interface RenderPose {
  time_s: number;
  payload: BodyPose;
  canopy: BodyPose | null;
  rpm: number | null;
  brake_mm: number[] | null;
  inflation: number | null;
}
