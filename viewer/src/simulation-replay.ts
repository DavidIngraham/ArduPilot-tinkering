import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {parseRecording,sample,position,orientation,type Frame} from './state';
import {rigPayload,poseMechanisms,RotorPhase,phaseAt} from './mechanisms';
import {canopyGeometry,canopyMaterial,updateSuspension} from './paraglider';
import {playback} from './playback';
import {drawWindFlag} from './wind';
import {drawControls} from './controls';
import {flightProfile,drawProfile} from './profile';
async function main(){
 const cases:Record<string,[string,string]>={turn:['gust-showcase.jsonl','Powered right turn, left reversal and brake release'],calm:['compare-calm.jsonl','Native AUTO · calm air'],gust:['compare-gust.jsonl','Native AUTO · synthetic gusts'],crosswind:['compare-crosswind.jsonl','Native AUTO · steady east wind']};
 const selected=cases[new URLSearchParams(location.search).get('case')||'turn']||cases.turn;
 const response=await fetch(selected[0]);if(!response.ok)throw Error('Recording unavailable');
 const track=parseRecording(await response.text());const start=track[0].time_s,end=track.at(-1)!.time_s;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#142735');scene.add(new THREE.HemisphereLight(0xe6f8ff,0x566473,3));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(3,8,4);scene.add(sun);
 const payload=new THREE.Group();payload.add((await new GLTFLoader().loadAsync('models/microagu-payload-tl.glb')).scene);scene.add(payload);
 const canopy=new THREE.Group();canopy.add(new THREE.Mesh(canopyGeometry(),canopyMaterial()));scene.add(canopy);
 const lines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xc8d7e2}));scene.add(lines);
 const rig=rigPayload(payload),clock=new RotorPhase(),phases=track.map(f=>clock.advance(f.time_s,f.rpm));
 const origin=position(track[0].state.slice(0,3));
 const grid=new THREE.GridHelper(2000,1000,0x506b7b,0x304958);grid.position.y=-3;scene.add(grid);
 const path=new THREE.Line(new THREE.BufferGeometry().setFromPoints(track.map(f=>position(f.state.slice(0,3)).sub(origin))),new THREE.LineBasicMaterial({color:0x70c6ad,transparent:true,opacity:.35}));scene.add(path);
 const trail=new THREE.Line(path.geometry.clone(),new THREE.LineBasicMaterial({color:0x70c6ad}));scene.add(trail);
 function update(time:number){const f=sample(track,time);payload.position.copy(position(f.state.slice(0,3)).sub(origin));payload.quaternion.copy(orientation(f.state.slice(3,7)));canopy.position.copy(position(f.state.slice(13,16)).sub(origin));canopy.quaternion.copy(orientation(f.state.slice(16,20)));updateSuspension(lines,payload,canopy,{},.066,undefined,f.brake_mm);if(rig)poseMechanisms(rig,phaseAt(track,phases,time),f.brake_mm,track[0].brake_mm);const next=track.findIndex(g=>g.time_s>time);trail.geometry.setDrawRange(0,next<0?track.length:next);return f;}
  const auto = track.length > 0 && track.every((f) => f.mode === "AUTO");
  const profile = flightProfile(track);
  const north = track.map((f) => f.state[0]),
    east = track.map((f) => f.state[1]);
  const minN = Math.min(...north),
    maxN = Math.max(...north);
  const minE = Math.min(...east),
    maxE = Math.max(...east);
  const span = Math.max(maxN - minN, maxE - minE, 1);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 900;
  const ctx = canvas.getContext("2d")!;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.005, 20000);
  const output = document.createElement("canvas");
  output.width = 1280;
  output.height = 852;
  const outputContext = output.getContext("2d")!;
  function panel(
    x: number,
    y: number,
    w: number,
    h: number,
    offset: THREE.Vector3,
    target: THREE.Vector3,
  ) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    camera.position.copy(target).add(x===20?orbitCamera.position.clone().sub(orbit.target):offset);
    camera.lookAt(target);
    renderer.render(scene, camera);
    ctx.drawImage(renderer.domElement, x, y, w, h);
  }

 document.querySelector('#view')!.append(output);
 const orbitCamera=new THREE.PerspectiveCamera();orbitCamera.position.set(2.5,1.1,3.8);
 const orbit=new OrbitControls(orbitCamera,output);orbit.enablePan=false;orbit.minDistance=1;orbit.maxDistance=20;orbit.update();
 document.querySelector('#reset-camera')!.addEventListener('click',()=>{orbitCamera.position.set(2.5,1.1,3.8);orbit.target.set(0,0,0);orbit.update();});
 document.querySelector('#title')!.textContent=selected[1];
 playback(start,end,(time)=>{
          const f = update(time);
          ctx.fillStyle = "#0b1520";
          ctx.fillRect(0, 0, 1280, 900);
          const center = payload.position.clone().lerp(canopy.position, 0.5);
          panel(20, 105, 805, 465, new THREE.Vector3(2.5, 1.1, 3.8), center);
          // Payload-mounted inspection camera keeps the capstans in view while the world turns.
          const detailOffset = new THREE.Vector3(
            -0.18,
            0.48,
            -0.15,
          ).applyQuaternion(payload.quaternion);
          panel(840, 105, 420, 465, detailOffset, payload.position.clone());
          ctx.fillStyle = "#70d8c6";
          ctx.font = "13px system-ui";
          ctx.fillText(
            f.turbulence
              ? "MICRO-AGU / 9-DOF SIMULATION · MODERATE SYNTHETIC TURBULENCE"
              : f.wind_ned_m_s?.some((v) => Math.abs(v) > 0.001)
                ? `MICRO-AGU / 9-DOF SIMULATION · STEADY WIND · ${Math.hypot(...f.wind_ned_m_s).toFixed(1)} m/s`
                : "MICRO-AGU / 9-DOF SIMULATION · CALM AIR",
            24,
            30,
          );
          ctx.fillStyle = "#e1edf4";
          ctx.font = "14px system-ui";
          ctx.fillText(
            "Canopy + payload · actual simulated articulation",
            34,
            129,
          );
          ctx.fillText("SolidWorks payload · capstans + rotor", 850, 129);
          {
            ctx.fillStyle = "rgba(11,21,32,.9)";
            ctx.fillRect(34, 200, 240, 186);
            ctx.fillStyle = "#e1edf4";
            ctx.font = "12px system-ui";
            ctx.fillText("Excerpt track · N ↑", 44, 219);
            const point = (g: Frame) => [
              78 + ((g.state[1] - (minE + maxE) / 2) / span) * 140 + 70,
              235 - ((g.state[0] - (minN + maxN) / 2) / span) * 140 + 70,
            ];
            ctx.beginPath();
            track.forEach((g, i) => {
              const [x, y] = point(g);
              if (i) ctx.lineTo(x, y);
              else ctx.moveTo(x, y);
            });
            ctx.strokeStyle = "#557788";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            track
              .filter((g) => g.time_s <= time)
              .forEach((g, i) => {
                const [x, y] = point(g);
                if (i) ctx.lineTo(x, y);
                else ctx.moveTo(x, y);
              });
            ctx.strokeStyle = "#70d8c6";
            ctx.stroke();
            const [x, y] = point(f);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
          }
          drawProfile(ctx, f, profile);
          drawWindFlag(ctx, f);
          drawControls(ctx, f, track);
          const deg = f.joint_rotvec_rad.map((v) =>
            ((v * 180) / Math.PI).toFixed(1),
          );
          ctx.font = "17px system-ui";
          ctx.fillText(
            `Joint rotation   roll ${deg[0]}°    pitch ${deg[1]}°    yaw ${deg[2]}°`,
            24,
            812,
          );
          ctx.fillText(
            `Brake travel   L ${f.brake_mm?.[0].toFixed(1)} mm    R ${f.brake_mm?.[1].toFixed(1)} mm`,
            24,
            841,
          );
          ctx.fillText(
            `Propeller ${f.rpm?.toFixed(0)} RPM    Throttle ${((f.throttle ?? 0) * 100).toFixed(0)}%`,
            840,
            812,
          );
          ctx.fillText(`t = ${time.toFixed(1)} s   ·   interactive replay`, 840, 841);
          ctx.fillStyle = "#8da4b5";
          ctx.font = "13px system-ui";
          if (f.wind_ned_m_s)
            ctx.fillText(
              `Wind velocity N / E / D: ${f.wind_ned_m_s.map((v) => v.toFixed(2)).join(" / ")} m/s`,
              24,
              862,
            );
          ctx.fillText(
            auto
              ? `Native AUTO · mission item ${f.mission_item} · altitude ${(-f.state[2]).toFixed(1)} m · schematic canopy/lines · no motion exaggeration`
              : "Simulation truth replay · schematic canopy/lines · no motion exaggeration",
            24,
            882,
          );
          ctx.fillStyle = "#70d8c6";
          ctx.fillRect(24, 890, (1232 * (time - start)) / (end - start), 3);
          // Omit the former title band while preserving telemetry and camera sizes.
          outputContext.drawImage(canvas, 0, 0, 1280, 40, 0, 0, 1280, 40);
          outputContext.drawImage(canvas, 0, 88, 1280, 812, 0, 40, 1280, 812);

 });
 document.querySelector('#status')!.textContent='Recorded simulation · drag to orbit the aircraft; scroll to zoom · bright trajectory shows traveled path';
}
main().catch(e=>document.querySelector('#status')!.textContent=String(e));
