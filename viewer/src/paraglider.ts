import * as T from 'three';

/** Visual construction, not a fabric solver. Body-local FRD, metres.
 * Defaults follow the calibrated simulator; the 2.4 m catalogue span is not
 * silently substituted for its 2.15 m effective arc. Cell count, airfoil,
 * taper, seams and line cascades are illustrative photo-inspired detail.
 */
export interface CanopyShape { arcSpan?: number; halfArc?: number; chord?: number }
const defaults = {arcSpan: 2.15, halfArc: .94598569, chord: .54};
export function canopyPoint(eta: number, u: number, shape: CanopyShape = {}, upper = false, billow = 0) {
  const {arcSpan, halfArc, chord} = {...defaults, ...shape};
  const radius = arcSpan / (2 * halfArc), theta = eta * halfArc;
  // Same five-panel vertical reference used by the rigging study.
  let mean = 0;
  for (let j=0;j<5;j++) mean += radius*(1-Math.cos(((j+.5)/5*2-1)*halfArc))/5;
  const c = chord*(1-.22*Math.pow(Math.abs(eta),4));
  const thickness = c*.12*5*(.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u**3-.1036*u**4);
  const camber = c*.025*Math.sin(Math.PI*u);
  const h = camber + (upper ? thickness*(.88+.12*billow) : -thickness*.65);
  return new T.Vector3((.5-u)*c-.025*eta*eta,
    radius*Math.sin(theta)+h*Math.sin(theta),
    radius*(1-Math.cos(theta))-mean-h*Math.cos(theta));
}
export function canopyGeometry(shape: CanopyShape = {}) {
  const {arcSpan,halfArc,chord}={...defaults,...shape};
  if (!(arcSpan>0 && chord>0 && halfArc>0 && halfArc<Math.PI/2)) throw Error('Invalid canopy dimensions');
  const pos:number[]=[], colors:number[]=[], indices:number[]=[];
  const cells=28, across=4, along=20;
  const white = new T.Color('#e8ebe3'), black = new T.Color('#25302c');
  const green = new T.Color('#8dc838'), yellow = new T.Color('#ecdc43');
  function add(p:T.Vector3,c:T.Color){pos.push(...p.toArray());colors.push(c.r,c.g,c.b);return pos.length/3-1;}
  for(let cell=0;cell<cells;cell++) {
    const panel = cell<9?green:cell<11?black:cell<17?white:cell<19?black:yellow;
    for(const upper of [true,false]) {
      const base=pos.length/3;
      for(let j=0;j<=across;j++) for(let k=0;k<=along;k++) {
        // Leave the lower leading edge open: visible ram-air inlet, shaded ribs.
        const u=upper?k/along:.045+(1-.045)*k/along;
        const eta=-1+2*(cell+j/across)/cells;
        const seam=j===0||j===across;
        const color=panel.clone().multiplyScalar(seam?.65:upper?1:.82);
        add(canopyPoint(eta,u,shape,upper,Math.sin(Math.PI*j/across)),color);
        if(j<across&&k<along){const a=base+j*(along+1)+k,b=a+along+1;
          if(upper)indices.push(a,a+1,b,a+1,b+1,b);else indices.push(a,b,a+1,a+1,b,b+1);
        }
      }
    }
    // End-cell walls and ribs visible inside the open leading edge.
    for(const eta of [-1+2*cell/cells, -1+2*(cell+1)/cells]) {
      const base=pos.length/3;
      for(let k=0;k<=along;k++) {
        const u=.045+.955*k/along;
        add(canopyPoint(eta,u,shape,true),panel.clone().multiplyScalar(.55));
        add(canopyPoint(eta,u,shape,false),panel.clone().multiplyScalar(.55));
        if(k<along){const a=base+k*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export function canopyMaterial() {return new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.92});}

/** Branching suspension layout. Anchors follow both recorded rigid bodies.
 * This rendering is schematic: no extra spring, tension or motion is simulated.
 */
export function updateSuspension(lines:T.LineSegments, body:T.Object3D, wing:T.Object3D, shape:CanopyShape={}, halfSpacing=.066, hinge=new T.Vector3(.0053,0,-.102)) {
  body.updateWorldMatrix(true,false);wing.updateWorldMatrix(true,false);
  // Small white webbing risers and metal rings use the same moving anchors.
  if(!lines.userData.risers) {
    lines.userData.risers=[-1,1].map(()=>{
      const strap=new T.Mesh(new T.BoxGeometry(.012,.003,.06),new T.MeshStandardMaterial({color:0xe7e5dc,roughness:.9}));
      const ring=new T.Mesh(new T.TorusGeometry(.009,.0015,5,16),new T.MeshStandardMaterial({color:0xb2b6b8,metalness:.7,roughness:.3}));
      lines.add(strap,ring);return {strap,ring};
    });
    const material=lines.material as T.LineBasicMaterial;material.transparent=true;material.opacity=.42;
  }
  const points:T.Vector3[]=[];
  const segment=(a:T.Vector3,b:T.Vector3)=>points.push(a,b);
  for(const side of [-1,1]) {
    const bolt=body.localToWorld(hinge.clone().add(new T.Vector3(0,side*halfSpacing,0)));
    const aim=wing.localToWorld(canopyPoint(side*.45,.4,shape));
    const riser=bolt.clone().add(aim.clone().sub(bolt).normalize().multiplyScalar(.06));
    const detail=lines.userData.risers[side<0?0:1];
    detail.strap.position.copy(bolt).lerp(riser,.5);
    detail.strap.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),riser.clone().sub(bolt).normalize());
    detail.ring.position.copy(riser);detail.ring.quaternion.copy(body.quaternion);
    segment(bolt,riser);
    for(const u of [.18,.5,.78]) for(const band of [0,1]) {
      const center=wing.localToWorld(canopyPoint(side*(.23+.49*band),u,shape));
      const cascade=riser.clone().lerp(center,.58);
      segment(riser,cascade);
      for(let k=0;k<5;k++) segment(cascade,wing.localToWorld(canopyPoint(side*(.04+.48*band+.095*k),u,shape)));
    }
    // Brake guide -> moving riser ring -> trailing-edge fan (nominal routing).
    const guide=body.localToWorld(hinge.clone().add(new T.Vector3(-.0225,side*.0455,0)));
    segment(guide,riser);
    const brakeJunction=riser.clone().lerp(wing.localToWorld(canopyPoint(side*.65,1,shape)),.62);
    segment(riser,brakeJunction);
    for(const eta of [.2,.4,.6,.8,.98])segment(brakeJunction,wing.localToWorld(canopyPoint(side*eta,1,shape)));
  }
  const flat=points.flatMap(p=>p.toArray());
  let attr=lines.geometry.getAttribute('position') as T.BufferAttribute|undefined;
  if(!attr||attr.count!==points.length){attr=new T.Float32BufferAttribute(flat,3);lines.geometry.setAttribute('position',attr);}else{(attr.array as Float32Array).set(flat);attr.needsUpdate=true;}
  lines.geometry.computeBoundingSphere();
}
