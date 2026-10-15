import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {canopyGeometry,canopyPoint,updateSuspension,brakeOffset,brakedCanopyPoint,brakeInfluences,poseCanopyBrakes} from './paraglider';
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
  assert.ok(g.getAttribute('normal').getZ(13*294+52)<0, 'upper crown normal points up in FRD');
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

test('brakes smoothly curl only the aft fabric, with correct left/right mapping',()=>{
 assert.deepEqual(brakeInfluences(null),[0,0]);assert.deepEqual(brakeInfluences([NaN,-20]),[0,0]);assert.deepEqual(brakeInfluences([160,40]),[1,.5]);
 for(const eta of [-.8,0,.8])for(const u of [0,.3,.6])assert.equal(brakeOffset(eta,u,{},[80,80]).length(),0);
 const left=brakeOffset(-.6,1,{},[40,0]),right=brakeOffset(.6,1,{},[0,40]);
 assert.ok(left.z>0&&left.x>0&&left.y>0);assert.ok(Math.abs(left.z-right.z)<1e-12&&Math.abs(left.y+right.y)<1e-12);
 assert.equal(brakeOffset(.6,1,{},[80,0]).length(),0);
 assert.ok(brakeOffset(-.6,.600001,{},[80,0]).length()<1e-10,'no crease at onset');
 assert.ok(brakeOffset(-1e-7,1,{},[80,0]).distanceTo(brakeOffset(1e-7,1,{},[80,0]))<1e-6,'center fabric stays continuous');
 assert.ok(brakeOffset(-.6,1,{},[40,0]).length()>brakeOffset(-.6,.8,{},[40,0]).length());
});
test('GPU skin morph and line endpoints share the same deformation; ghost stays independent',()=>{
 const g=canopyGeometry(),mesh=new T.Mesh(g,new T.MeshStandardMaterial()),ghost=new T.Mesh(g,mesh.material);
 const base=g.getAttribute('position'),left=g.morphAttributes.position[0];
 // First cell, upper skin, leading and trailing-edge vertices (u=0 and u=1).
 const before=new T.Vector3().fromBufferAttribute(base,0),after=new T.Vector3().fromBufferAttribute(left,0);assert.ok(before.distanceTo(after)<1e-9);
 const endpoint=new T.Vector3().fromBufferAttribute(left,20);
 const expected=canopyPoint(-1,1,{},true).add(brakeOffset(-1,1,{},[80,0]));assert.ok(endpoint.distanceTo(expected)<1e-6);
 for(const a of [...g.morphAttributes.position,...g.morphAttributes.normal])assert.ok(Array.from(a.array).every(Number.isFinite));
 poseCanopyBrakes(mesh,[40,0]);assert.deepEqual(mesh.morphTargetInfluences,[.5,0]);assert.deepEqual(ghost.morphTargetInfluences,[0,0]);
 poseCanopyBrakes(mesh,null);assert.deepEqual(mesh.morphTargetInfluences,[0,0]);
 const body=new T.Group();mesh.position.set(2,3,-1);mesh.rotation.x=.3;
 const lines=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial());
 updateSuspension(lines,body,mesh,{},.066,undefined,[0,40]);
 const attr=lines.geometry.getAttribute('position');
 const last=new T.Vector3().fromBufferAttribute(attr,attr.count-1);
 assert.ok(last.distanceTo(mesh.localToWorld(brakedCanopyPoint(.98,1,{},[0,40])))<1e-6);
});
