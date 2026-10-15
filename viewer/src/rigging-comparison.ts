import {canopyGeometry, canopyMaterial, updateSuspension} from './paraglider';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {position,orientation} from './state';
import {rigPayload,poseMechanisms} from './mechanisms';

async function main(){
 const host=document.querySelector<HTMLElement>('#replay')!;
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=1780;host.append(canvas);
 const ctx=canvas.getContext('2d')!;
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1280,500);
 const data=await (await fetch('rigging-comparison/data.json')).json();
 let runs:any[]=[];let labels=['132 mm routed','185 mm, same canopy'];
 const specs=[['height_rms','Height from start','m',1],['pitch_rms','Payload pitch rate','deg/s',2],['heading_rms','Ground-track heading change','deg',3],['pull','Mean effective brake pull','mm',4]] as const;
 const camera=new T.PerspectiveCamera(40,1,.01,2000);camera.position.set(4,2,5);
 const orbit=new OrbitControls(camera,canvas);orbit.target.set(0,.5,0);orbit.enablePan=false;orbit.minDistance=2;orbit.maxDistance=15;orbit.update();
 const model=await new GLTFLoader().loadAsync('models/microagu-payload-tl.glb');
 const views=[0x58a7d0,0x70c6ad].map(color=>{
  const scene=new T.Scene();scene.background=new T.Color('#142735');scene.add(new T.HemisphereLight(0xe6f8ff,0x566473,3));const light=new T.DirectionalLight(0xffffff,3);light.position.set(3,8,4);scene.add(light);
  const body=model.scene.clone(true);scene.add(body);const rig=rigPayload(body);
  const wing=new T.Mesh(canopyGeometry(),canopyMaterial());scene.add(wing);
  const lines=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xc8d7e2}));scene.add(lines);
  const grid=new T.GridHelper(1000,1000,0x506b7b,0x304958);grid.position.y=-3;scene.add(grid);
  const path=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color,transparent:true,opacity:.25}));scene.add(path);
  const trail=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color}));scene.add(trail);
  return {scene,body,rig,wing,lines,grid,path,trail,rows:[] as number[][],phases:[] as number[],distance:[] as number[],current:[] as number[]};
 });
 let time=15,playing=false,last=performance.now(),generation=0;
 const slider=document.querySelector<HTMLInputElement>('#replay-time')!,play=document.querySelector<HTMLButtonElement>('#replay-play')!,status=document.querySelector<HTMLElement>('#replay-status')!;
 const signal=()=>{slider.value=String(time);};
 play.onclick=()=>{playing=!playing;play.textContent=playing?'Pause':'Play';};
 slider.oninput=()=>{playing=false;play.textContent='Play';time=Number(slider.value);signal();};
 document.querySelector('#replay-reset')!.addEventListener('click',()=>{camera.position.set(4,2,5);orbit.target.set(0,.5,0);orbit.update();});
 canvas.addEventListener('pointerdown',e=>{const box=canvas.getBoundingClientRect();const y=(e.clientY-box.top)/box.height*1780;if(y<870)return;const x=(e.clientX-box.left)/box.width*1280;time=Math.max(0,Math.min(80,(x-75)/1160*80));playing=false;play.textContent='Play';signal();});
 document.querySelector('#replay-restart')!.addEventListener('click',()=>{time=0;playing=true;play.textContent='Pause';signal();});
 async function load(){
  const token=++generation;playing=false;play.textContent='Play';play.disabled=true;slider.disabled=true;status.textContent='Loading recorded aircraft poses…';
  const comparison=(document.querySelector('#comparison') as HTMLSelectElement).value;const name=comparison+'-'+(document.querySelector('#scenario') as HTMLSelectElement).value,sensing='truth';labels=comparison==='routing'?['Old model, retuned','132 mm routed, retuned']:['132 mm routed',{hardware:'185 mm, same canopy',half:'185 mm, half flattening',flattening:'185 mm, full flattening',drag:'185 mm, flattening + drag'}[comparison]||'185 mm'];
  runs=data.runs.filter((r:any)=>r.case===name&&r.observer===false);
  try{const rows=await Promise.all(['baseline','direct'].map(async family=>{const r=await fetch(`rigging-comparison/poses/${name}-${sensing}-${family}.json`);if(!r.ok)throw Error('Pose recording unavailable');return r.json() as Promise<number[][]>;}));if(token!==generation)return;
   rows.forEach((r,i)=>{views[i].rows=r;const v=views[i];
   const names=comparison==='routing'?['legacy','current']:['current',({hardware:'wide',half:'wide_half',flattening:'wide_flat',drag:'wide_drag'} as Record<string,string>)[comparison]];
   const meta=data.metadata.find((m:any)=>m.name===names[i]);
   v.wing.userData.shape={arcSpan:meta.arc_span,halfArc:meta.half_arc};
   v.wing.userData.halfSpacing=names[i].startsWith('wide')?.0925:.066;
   v.wing.geometry.dispose();v.wing.geometry=canopyGeometry(v.wing.userData.shape);
let distance=0;v.distance=r.map((a,j)=>{if(j)distance+=Math.hypot(a[1]-r[j-1][1],a[2]-r[j-1][2]);return distance;});
   v.path.geometry.dispose();v.trail.geometry.dispose();v.path.geometry=new T.BufferGeometry().setFromPoints(r.map(a=>position(a.slice(1,4))));v.trail.geometry=v.path.geometry.clone();let phase=0;views[i].phases=r.map((v,j)=>{if(j)phase+=(v[0]-r[j-1][0])*(v[27]+r[j-1][27])*Math.PI/60;return phase;});});
   time=0;playing=true;play.textContent='Pause';signal();play.disabled=false;slider.disabled=false;status.textContent='Predicted motion · drag either view to orbit both; scroll to zoom. Physical scale, no attitude exaggeration.';
  }catch(e){if(token===generation)status.textContent=String(e);}
 }
 document.querySelector('#scenario')!.addEventListener('change',load);document.querySelector('#comparison')!.addEventListener('change',load);await load();
 function draw(now:number){
  const dt=Math.min((now-last)/1000,.1);last=now;if(playing){time+=dt*Number((document.querySelector('#replay-speed') as HTMLSelectElement).value);if(time>=80)time=0;signal();}
  const w=1280,h=500;camera.aspect=w/2/h;camera.updateProjectionMatrix();renderer.setScissorTest(true);
  views.forEach((v,i)=>{
   if(!v.rows.length)return;
   const n=Math.min(799,Math.floor(time*10)),a=v.rows[n],b=v.rows[n+1],f=Math.min(1,(time-a[0])/(b[0]-a[0]));const r=a.map((x,j)=>x+(b[j]-x)*f);
   for(const k of [4,17])r.splice(k,4,...new T.Quaternion().fromArray(a,k).slerp(new T.Quaternion().fromArray(b,k),f).toArray());
   v.current=r;
   const p=position(r.slice(1,4));v.path.position.copy(p).negate();v.trail.position.copy(p).negate();v.trail.geometry.setDrawRange(0,n+1);v.body.position.set(0,0,0);v.body.quaternion.copy(orientation(r.slice(4,8)));v.wing.position.copy(position(r.slice(14,17)).sub(p));v.wing.quaternion.copy(orientation(r.slice(17,21)));
   // Each camera follows its payload; the grid retains earth-fixed altitude and translation.
   v.grid.position.set(-p.x,-3-p.y,-p.z);
   if(v.rig)poseMechanisms(v.rig,v.phases[n]+(v.phases[n+1]-v.phases[n])*f,r.slice(30,32),v.rows[0].slice(30,32));
   updateSuspension(v.lines,v.body,v.wing,v.wing.userData.shape,v.wing.userData.halfSpacing,undefined,r.slice(30,32));
   renderer.setViewport(i*w/2,0,w/2,h);renderer.setScissor(i*w/2,0,w/2,h);renderer.render(v.scene,camera);
  });
  ctx.fillStyle='#102330';ctx.fillRect(0,0,1280,1780);ctx.drawImage(renderer.domElement,0,0);
  ctx.font='22px system-ui';ctx.fillStyle='#58a7d0';ctx.fillText(labels[0],24,32);ctx.fillStyle='#70c6ad';ctx.fillText(labels[1],664,32);
  ctx.fillStyle='#edf5ff';ctx.font='18px system-ui';ctx.fillText(`${time.toFixed(1)} s / 80 s · same scale and camera · simulated physical motion`,24,530);
  // Overview paths share axes across controllers; only the top-down view uses equal metre scales.
  if(views.every(v=>v.rows.length)){
   for(const side of [false,true]){
    const left=side?690:65,top=590,width=535,height=205;
    const series=views.map(v=>v.rows.map((r,j)=>side?[v.distance[j],-r[3]]:[r[2],r[1]]));
    const all=series.flat(),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);let xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
    let dx=Math.max(xmax-xmin,1),dy=Math.max(ymax-ymin,.2);const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;
    if(!side){const scale=Math.max(dx/width,dy/height)*1.1;dx=scale*width;dy=scale*height;}else{dx*=1.1;dy*=1.2;}
    xmin=cx-dx/2;xmax=cx+dx/2;ymin=cy-dy/2;ymax=cy+dy/2;
    const px=(x:number)=>left+(x-xmin)/dx*width,py=(y:number)=>top+height-(y-ymin)/dy*height;
    ctx.fillStyle='#edf5ff';ctx.font='20px system-ui';ctx.fillText(side?'Side profile · altitude vs distance traveled':'Top down · north up · equal metre scales',left-40,565);
    ctx.fillStyle='#b9cbd7';ctx.font='14px system-ui';
    for(let k=0;k<3;k++){
     const x=xmin+dx*k/2,y=ymin+dy*k/2;ctx.strokeStyle='#304958';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px(x),top);ctx.lineTo(px(x),top+height);ctx.moveTo(left,py(y));ctx.lineTo(left+width,py(y));ctx.stroke();ctx.fillText(x.toFixed(1),px(x)-12,top+height+20);ctx.fillText(y.toFixed(1),left-48,py(y)+5);
    }
    ctx.fillText(side?'Horizontal distance along each track (m)':'East from common start (m)',left+80,top+height+42);
    ctx.save();ctx.translate(left-52,top+height/2);ctx.rotate(-Math.PI/2);ctx.fillText(side?'Height from start (m)':'North (m)',-65,0);ctx.restore();
    ctx.save();ctx.beginPath();ctx.rect(left,top,width,height);ctx.clip();
    series.forEach((points,i)=>{
     const color=i?'#70c6ad':'#58a7d0',n=Math.min(799,Math.floor(time*10)),fraction=Math.min(1,(time-views[i].rows[n][0])/.1);
     ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha=.3;ctx.beginPath();points.forEach((p,j)=>j?ctx.lineTo(px(p[0]),py(p[1])):ctx.moveTo(px(p[0]),py(p[1])));ctx.stroke();ctx.globalAlpha=1;
     ctx.beginPath();points.slice(0,n+1).forEach((p,j)=>j?ctx.lineTo(px(p[0]),py(p[1])):ctx.moveTo(px(p[0]),py(p[1])));ctx.stroke();
     const x=points[n][0]+(points[n+1][0]-points[n][0])*fraction,y=points[n][1]+(points[n+1][1]-points[n][1])*fraction;
     ctx.fillStyle=color;ctx.beginPath();ctx.arc(px(x),py(y),5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#edf5ff';ctx.lineWidth=1;ctx.stroke();
    });ctx.restore();
   }
   ctx.fillStyle='#b9cbd7';ctx.font='15px system-ui';ctx.fillText('Bright: traveled path · Faint: complete recording · Dots: current aircraft · Side profile uses independent axis scales',24,865);
  }
  const baseline=runs.find(r=>r.family==='baseline'),direct=runs.find(r=>r.family==='direct');
  if(baseline&&direct){
   const showCandidate=false;
   const shown=runs.filter(r=>r.family!=='candidate'||showCandidate);
   for(let j=0;j<specs.length;j++){
    const [key,label,unit,col]=specs[j],top=890+j*210;
    const values=shown.flatMap(r=>r.trace.map((t:number[])=>t[col]));let lo=Math.min(0,...values),hi=Math.max(0,...values);const pad=Math.max((hi-lo)*.08,.001);lo-=pad;hi+=pad;
    const x=(t:number)=>75+t/80*1160,y=(a:number)=>top+155-(a-lo)/(hi-lo)*115;
    ctx.fillStyle='#edf5ff';ctx.font='19px system-ui';ctx.fillText(`${label} (${unit})`,24,top+10);
    ctx.font='17px system-ui';ctx.fillStyle='#b9cbd7';ctx.fillText('Matched input increments · individual level trim · no feedback controller',490,top+10);
    ctx.font='15px system-ui';
    for(let k=0;k<3;k++){const value=lo+(hi-lo)*k/2;ctx.strokeStyle='#304958';ctx.beginPath();ctx.moveTo(75,y(value));ctx.lineTo(1235,y(value));ctx.stroke();ctx.fillStyle='#b9cbd7';ctx.fillText(value.toFixed(1),8,y(value)+5);}
    ctx.fillStyle='#162f3e';ctx.fillRect(75,top+40,x(baseline.start)-75,115);
    for(const r of shown){ctx.strokeStyle=r.family==='baseline'?'#58a7d0':r.family==='direct'?'#70c6ad':'#ffba68';ctx.lineWidth=2;ctx.setLineDash(r.family==='candidate'?[6,4]:[]);ctx.beginPath();r.trace.forEach((t:number[],i:number)=>i?ctx.lineTo(x(t[0]),y(t[col])):ctx.moveTo(x(t[0]),y(t[col])));ctx.stroke();}ctx.setLineDash([]);
    ctx.strokeStyle='#edf5ff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x(time),top+35);ctx.lineTo(x(time),top+160);ctx.stroke();ctx.fillStyle='#b9cbd7';for(let t=0;t<=80;t+=10)ctx.fillText(String(t),x(t)-7,top+180);ctx.fillText('Time (s)',1150,top+201);
   }
   ctx.fillStyle='#b9cbd7';ctx.font='16px system-ui';ctx.fillText('Blue and green identify the views above · Shading: before first input · Predictions, not recorded flights',24,1760);
  }
  document.querySelector('#replay-clock')!.textContent=`${time.toFixed(1)} s`;requestAnimationFrame(draw);
 }
 requestAnimationFrame(draw);
}
main().catch(e=>{document.querySelector('#replay-status')!.textContent=`3D unavailable: ${e.message}. Open the static plots in the article.`;});
