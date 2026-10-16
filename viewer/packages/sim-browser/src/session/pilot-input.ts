import { MODES } from "@microagu/contracts/telemetry";
export const altitudeLever = (mode: number) =>
  mode === MODES.FBWB || mode === MODES.CRUISE;
export const manualPower = (mode: number) =>
  mode === MODES.MANUAL || mode === MODES.FBWA;
export const pilotSteering = (mode: number) =>
  [
    MODES.MANUAL,
    MODES.FBWA,
    MODES.FBWB,
    MODES.CRUISE,
    MODES.AUTO,
    MODES.LOITER,
  ].includes(mode);

export function pilotChannels(
  mode: number,
  roll: number,
  pitch: number,
  lever: number,
  trim: number,
) {
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  if (![roll, pitch, lever, trim].every(Number.isFinite))
    throw Error("Invalid pilot input");
  const height = altitudeLever(mode);
  return [
    1500 + Math.round(clamp(roll, -1, 1) * 500),
    1500 +
      Math.round(
        clamp(
          height ? 2 * lever - 1 : mode === MODES.MANUAL ? pitch : 0,
          -1,
          1,
        ) * 500,
      ),
    1000 + Math.round(clamp(manualPower(mode) ? lever : trim, 0, 1) * 1000),
  ];
}
