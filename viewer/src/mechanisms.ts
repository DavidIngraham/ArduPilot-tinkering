import { Group, Object3D, Vector3, Mesh, MeshStandardMaterial } from "three";
import type { Frame } from "./state";

/** Rotor phase is integrated from RPM; shaft phase at the first sample is arbitrary. */
export class RotorPhase {
  private lastTime: number | null = null;
  private lastRPM: number | null = null;
  angle = 0;
  reset() {
    this.lastTime = null;
    this.lastRPM = null;
    this.angle = 0;
  }
  advance(time: number, rpm: number | null) {
    if (
      this.lastTime !== null &&
      time >= this.lastTime &&
      rpm !== null &&
      this.lastRPM !== null
    )
      this.angle =
        (this.angle +
          ((time - this.lastTime) * (rpm + this.lastRPM) * Math.PI) / 60) %
        (2 * Math.PI);
    this.lastTime = time;
    this.lastRPM = rpm;
    return this.angle;
  }
}
export function brakeAngle(travelMM: number, referenceMM: number) {
  return (travelMM - referenceMM) / 27.5;
}
function named(root: Object3D, name: string) {
  let found: Object3D | undefined;
  root.traverse((n) => {
    if (n.userData.name === name || n.name === name) found = n;
  });
  return found;
}
function pivot(
  assembly: Object3D,
  name: string,
  center: Vector3,
  parts: Object3D[],
) {
  const group = new Group();
  group.name = name;
  group.position.copy(center);
  assembly.add(group);
  assembly.updateWorldMatrix(true, true);
  parts.forEach((part) => group.attach(part));
  return group;
}
/** Visual paint only, attached to the rotating CAD geometry. */
function markCapstan(assembly: Object3D, part: Object3D) {
  assembly.updateWorldMatrix(true, true);
  const toAssembly = assembly.matrixWorld.clone().invert();
  part.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const transform = toAssembly.clone().multiply(node.matrixWorld);
    const material = new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.capstanToCAD = { value: transform };
      shader.vertexShader =
        "uniform mat4 capstanToCAD; varying vec2 capstanXZ;\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        vec3 cad = (capstanToCAD * vec4(position, 1.0)).xyz;
        capstanXZ = cad.xz - vec2(0.044375729, 0.1205);
      `,
      );
      shader.fragmentShader =
        "varying vec2 capstanXZ;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        float angle = atan(capstanXZ.y, capstanXZ.x);
        vec3 paint = sin(2.0 * angle) > 0.0 ? vec3(0.025) : vec3(0.95);
        if (abs(angle) < 0.16) paint = vec3(1.0, 0.24, 0.015);
        diffuseColor.rgb *= paint;
      `,
      );
    };
    material.customProgramCacheKey = () => "capstan-quarter-paint-v1";
    node.material = material;
  });
}
export interface Mechanisms {
  rotor: Group;
  left: Group;
  right: Group;
}
/** Pivots in original assembly CAD metres; group.attach preserves exported placement. */
export function rigPayload(root: Object3D): Mechanisms | null {
  const assembly = named(root, "microAGU");
  if (!assembly) return null;
  const prop = named(root, "APC 9x6 CW-1"),
    rotor = named(root, "Rotor-1");
  const left = [
    named(root, "ServoAssembly-2/ControlArm-1"),
    named(root, "ServoAssembly-2/ServoHorn-1"),
  ];
  const right = [
    named(root, "ServoAssembly-1/ControlArm-1"),
    named(root, "ServoAssembly-1/ServoHorn-1"),
  ];
  if (!prop || !rotor || left.some((x) => !x) || right.some((x) => !x))
    return null;
  markCapstan(assembly, left[0]!);
  markCapstan(assembly, right[0]!);
  return {
    rotor: pivot(
      assembly,
      "Propeller and motor rotor",
      new Vector3(0, 0, 0.125),
      [prop, rotor],
    ),
    left: pivot(
      assembly,
      "Left capstan shaft",
      new Vector3(0.044375729, 0, 0.1205),
      left as Object3D[],
    ),
    right: pivot(
      assembly,
      "Right capstan shaft",
      new Vector3(0.044375729, 0, 0.1205),
      right as Object3D[],
    ),
  };
}
export function poseMechanisms(
  rig: Mechanisms,
  phase: number,
  brakes: number[] | null,
  reference: number[] | null,
) {
  // CAD +X is forward: positive rotation is clockwise viewed from behind.
  rig.rotor.rotation.x = phase;
  // CAD +Y is left. Opposite winding signs; CAD pose is the first sample's reference.
  rig.left.rotation.y =
    brakes && reference ? brakeAngle(brakes[0], reference[0]) : 0;
  rig.right.rotation.y =
    brakes && reference ? -brakeAngle(brakes[1], reference[1]) : 0;
}
export function phaseAt(
  frames: Frame[],
  phases: number[],
  time: number,
): number {
  let low = 0,
    high = frames.length - 1;
  if (time <= frames[0].time_s) return phases[0];
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (frames[mid].time_s <= time) low = mid;
    else high = mid - 1;
  }
  const a = frames[low],
    b = frames[low + 1];
  if (!b || a.rpm === null || b.rpm === null) return phases[low];
  const dt = time - a.time_s,
    span = b.time_s - a.time_s;
  return (
    (phases[low] +
      ((a.rpm * dt + (0.5 * (b.rpm - a.rpm) * dt * dt) / span) * Math.PI) /
        30) %
    (2 * Math.PI)
  );
}
