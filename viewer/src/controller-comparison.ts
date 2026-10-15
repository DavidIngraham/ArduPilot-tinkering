import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {position,orientation} from './state';
import {rigPayload,poseMechanisms} from './mechanisms';

async function main(){
 const host=document.querySelector<HTMLElement>('#replay')!;
 const canvas=document.createElement('canvas');host.append(canvas);
 const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 const camera=new T.PerspectiveCamera(40,1,.01,2000);camera.position.set(4,2,5);
 const orbit=new OrbitControls(camera,canvas);orbit.target.set(0,.5,0);orbit.enablePan=false;orbit.minDistance=2;orbit.maxDistance=15;orbit.update();
 const model=await new GLTFLoader().loadAsync('/assets/microagu-viewer/models/microagu-payload-tl.glb');
 const views=[0x58a7d0,0x70c6ad].map(color=>{
  const scene=new T.Scene();scene.background=new T.Color('#142735');scene.add(new T.HemisphereLight(0xe6f8ff,0x566473,3));const light=new T.DirectionalLight(0xffffff,3);light.position.set(3,8,4);scene.add(light);
  const body=model.scene.clone(true);scene.add(body);const rig=rigPayload(body);
  const vertices:number[]=[],indices:number[]=[];
  for(let i=0;i<=24;i++){const a=(i/24-.5)*Math.PI*.8;for(const x of [-.27,.27])vertices.push(x,Math.sin(a)*1.05,(1-Math.cos(a))*.45);}
  for(let i=0;i<24;i++){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const wing=new T.Mesh(geometry,new T.MeshStandardMaterial({color,side:T.DoubleSide}));scene.add(wing);
  const lines=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xc8d7e2}));scene.add(lines);
  const grid=new T.GridHelper(1000,1000,0x506b7b,0x304958);grid.position.y=-3;scene.add(grid);
  return {scene,body,rig,wing,lines,grid,rows:[] as number[][],phases:[] as number[]};
 });
 let time=15,playing=false,last=performance.now(),generation=0;
 const slider=document.querySelector<HTMLInputElement>('#replay-time')!,play=document.querySelector<HTMLButtonElement>('#replay-play')!,status=document.querySelector<HTMLElement>('#replay-status')!;
 const signal=()=>{slider.value=String(time);document.dispatchEvent(new CustomEvent('replay-time',{detail:time}));};
 play.onclick=()=>{playing=!playing;play.textContent=playing?'Pause':'Play';};
 slider.oninput=()=>{playing=false;play.textContent='Play';time=Number(slider.value);signal();};
 document.querySelector('#replay-reset')!.addEventListener('click',()=>{camera.position.set(4,2,5);orbit.target.set(0,.5,0);orbit.update();});
 document.addEventListener('comparison-time',e=>{time=(e as CustomEvent<number>).detail;playing=false;play.textContent='Play';signal();});
 async function load(){
  const token=++generation;playing=false;play.textContent='Play';play.disabled=true;slider.disabled=true;status.textContent='Loading recorded aircraft poses…';
  const name=(document.querySelector('#scenario') as HTMLSelectElement).value,sensing=(document.querySelector('#sensing') as HTMLSelectElement).value==='true'?'observer':'truth';
  try{const rows=await Promise.all(['baseline','direct'].map(async family=>{const r=await fetch(`poses/${name}-${sensing}-${family}.json`);if(!r.ok)throw Error('Pose recording unavailable');return r.json() as Promise<number[][]>;}));if(token!==generation)return;
   rows.forEach((r,i)=>{views[i].rows=r;let phase=0;views[i].phases=r.map((v,j)=>{if(j)phase+=(v[0]-r[j-1][0])*(v[27]+r[j-1][27])*Math.PI/60;return phase;});});
   time=['maneuver','speed_transition','limits_recovery'].includes(name)?5:15;signal();play.disabled=false;slider.disabled=false;status.textContent='Ready · drag either view to orbit both; scroll to zoom. Physical scale, no attitude exaggeration.';
  }catch(e){if(token===generation)status.textContent=String(e);}
 }
 document.querySelector('#scenario')!.addEventListener('change',load);document.querySelector('#sensing')!.addEventListener('change',load);await load();
 function draw(now:number){
  const dt=Math.min((now-last)/1000,.1);last=now;if(playing){time+=dt*Number((document.querySelector('#replay-speed') as HTMLSelectElement).value);if(time>=80){time=80;playing=false;play.textContent='Play';}signal();}
  const w=host.clientWidth,h=Math.max(260,Math.min(440,w*.42));renderer.setSize(w,h,false);camera.aspect=w/2/h;camera.updateProjectionMatrix();renderer.setScissorTest(true);
  views.forEach((v,i)=>{
   if(!v.rows.length)return;
   const n=Math.min(799,Math.floor(time*10)),a=v.rows[n],b=v.rows[n+1],f=Math.min(1,(time-a[0])/(b[0]-a[0]));const r=a.map((x,j)=>x+(b[j]-x)*f);
   for(const k of [4,17])r.splice(k,4,...new T.Quaternion().fromArray(a,k).slerp(new T.Quaternion().fromArray(b,k),f).toArray());
   const p=position(r.slice(1,4));v.body.position.set(0,0,0);v.body.quaternion.copy(orientation(r.slice(4,8)));v.wing.position.copy(position(r.slice(14,17)).sub(p));v.wing.quaternion.copy(orientation(r.slice(17,21)));
   // Each camera follows its payload; the grid retains earth-fixed altitude and translation.
   v.grid.position.set(-p.x,-3-p.y,-p.z);
   if(v.rig)poseMechanisms(v.rig,v.phases[n]+(v.phases[n+1]-v.phases[n])*f,r.slice(30,32),v.rows[0].slice(30,32));
   const points:T.Vector3[]=[];for(const y of [-.8,.8])for(const x of [-.22,.22])points.push(new T.Vector3(x,y,.12).applyQuaternion(v.wing.quaternion).add(v.wing.position),new T.Vector3(0,y*.15,-.1).applyQuaternion(v.body.quaternion));
   v.lines.geometry.dispose();v.lines.geometry=new T.BufferGeometry().setFromPoints(points);
   renderer.setViewport(i*w/2,0,w/2,h);renderer.setScissor(i*w/2,0,w/2,h);renderer.render(v.scene,camera);
  });
  document.querySelector('#replay-clock')!.textContent=`${time.toFixed(1)} s`;requestAnimationFrame(draw);
 }
 requestAnimationFrame(draw);
}
main().catch(e=>{document.querySelector('#replay-status')!.textContent=`3D unavailable: ${e.message}. Recorded plots remain available.`;});
