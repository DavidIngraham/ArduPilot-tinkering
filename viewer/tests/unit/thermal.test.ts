import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { ThermalColumn } from "@microagu/rendering/scene/thermal";
import { disposeTree } from "@microagu/rendering/scene/resources";

test("thermal marker follows NED settings and animates only with simulation time", () => {
  const column = new ThermalColumn();
  const settings = {
    thermalStrength: 2,
    thermalRadius: 30,
    thermalNorth: 100,
    thermalEast: -20,
  };
  assert.equal(column.visible, false);
  column.configure(settings);
  assert.ok(column.position.distanceTo(new T.Vector3(-20, 0, -100)) < 1e-9);
  assert.equal(column.visible, true);
  const tracers = column.children.find(
    (child) => child instanceof T.InstancedMesh,
  ) as T.InstancedMesh;
  const a = new T.Matrix4(),
    b = new T.Matrix4();
  column.update(1);
  tracers.getMatrixAt(10, a);
  column.update(1);
  tracers.getMatrixAt(10, b);
  assert.deepEqual(a.elements, b.elements, "paused truth must freeze motion");
  column.update(2);
  tracers.getMatrixAt(10, b);
  assert.ok(b.elements[13] > a.elements[13], "tracers must rise");
  column.configure({ ...settings, thermalStrength: 0 });
  assert.equal(column.visible, false);
  disposeTree(column);
  assert.equal(column.children.length, 0);
});
