import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {canopyGeometry,canopyPoint,updateSuspension} from './paraglider';
test('effective span, reflection symmetry and finite normals survive geometry variants',()=>{
 for(const halfArc of [.7,.94598569,1.1]) {
  const shape={arcSpan:2.15,halfArc};
  const a=canopyPoint(-1,.5,shape),b=canopyPoint(1,.5,shape);
  assert.ok(Math.abs(a.x-b.x)<1e-10&&Math.abs(a.y+b.y)<1e-10&&Math.abs(a.z-b.z)<1e-10);
  // Leading-edge reference has no section camber or thickness offset.
  const span=canopyPoint(1,0,shape).y-canopyPoint(-1,0,shape).y;
  assert.ok(Math.abs(span-2.15/halfArc*Math.sin(halfArc))<1e-10);
  const g=canopyGeometry(shape);
  for(const key of ['position','normal'])assert.ok(Array.from(g.getAttribute(key).array).every(Number.isFinite));
  g.dispose();
 }
 assert.throws(()=>canopyGeometry({halfArc:0}));
});
test('suspension follows rigid bodies and reuses its buffer while changing spacing',()=>{
 const body=new T.Group(),wing=new T.Group();wing.position.z=-.85;
 const lines=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial());
 updateSuspension(lines,body,wing,{},.066);
 const attr=lines.geometry.getAttribute('position');assert.ok(Math.abs(attr.getY(0)+.066)<1e-6);
 const old=Array.from(attr.array);
 body.position.x=3;wing.position.x=3;updateSuspension(lines,body,wing,{},.066);
 assert.equal(attr,lines.geometry.getAttribute('position'));
 for(let i=0;i<attr.count;i++)assert.ok(Math.abs(attr.getX(i)-old[i*3]-3)<1e-5);
 updateSuspension(lines,body,wing,{},.0925);assert.ok(Math.abs(attr.getY(0)+.0925)<1e-6);
});
