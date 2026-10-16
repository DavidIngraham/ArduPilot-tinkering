import * as T from "three";
/** Grid and launch marking share one fragment/depth sample: no coplanar meshes. */
export function flightGround() {
  const material = new T.MeshStandardMaterial({
    color: 0x6e8363,
    roughness: 1,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec2 groundXZ;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ngroundXZ = (modelMatrix * vec4(transformed, 1.0)).xz;",
    );
    shader.fragmentShader = "varying vec2 groundXZ;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 cell = groundXZ / 25.0;
      vec2 width = max(fwidth(cell), vec2(0.00001));
      vec2 line = abs(fract(cell - 0.5) - 0.5) / width;
      float grid = 1.0 - clamp(min(line.x, line.y), 0.0, 1.0);
      float fade = 1.0 - smoothstep(0.08, 0.35, max(width.x,width.y));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30,0.39,0.29), grid * fade * 0.45);
      float radius = length(groundXZ);
      float edge = max(fwidth(radius),0.01);
      float pad = 1.0 - smoothstep(12.0-edge,12.0+edge,radius);
      diffuseColor.rgb = mix(diffuseColor.rgb,vec3(0.43,0.40,0.25),pad);
    `,
    );
  };
  material.customProgramCacheKey = () => "microagu-ground-grid-v1";
  const mesh = new T.Mesh(new T.PlaneGeometry(8000, 8000), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  return mesh;
}
