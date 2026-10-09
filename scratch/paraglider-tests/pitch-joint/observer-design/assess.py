import json,sys
from pathlib import Path
import numpy as np
from scipy.linalg import expm
sys.path.insert(0,'/workspace/scratch/paraglider-tests/pitch-joint/physics-review')
from trim import Physics
r=Path(__file__).parent;d=json.loads((r.parent/'oracle-control/design.json').read_text());tr=d['trim'];x=np.array([tr['theta'],tr['relative'],0,0,tr['V'],0,tr['throttle']]);p=Physics('joint');fraction=.19/1.55

def R(t):return np.array([[np.cos(t),np.sin(t)],[-np.sin(t),np.cos(t)]])
def cross(v):return np.array([v[1],-v[0]])
def measurement(x):
 th,de,qp,qr,vx,vz,u=x;e=p.evaluate(th,de,qp,qr,vx,vz,u);a=np.array([0,.35]);b=R(de)@np.array([-.3,-.85]);qc=qp+qr;ap=e[2];ac=e[2]+e[3]
 offset=fraction*(ap*cross(a)-qp*qp*a-ac*cross(b)+qc*qc*b)
 specific=e[[6,7]]/1.55+offset
 velocity=R(th)@(fraction*(qp*cross(a)-qc*cross(b)))+np.array([vx,vz])
 return np.r_[th,qp,velocity,specific,np.hypot(vx,vz)]
h=.0005;C7=np.column_stack([(measurement(x+np.eye(7)[i]*h)-measurement(x-np.eye(7)[i]*h))/(2*h) for i in range(7)]);p.close()
A=np.zeros((9,9));A[:6,:6]=d['A'];A[:6,6]=d['B'];A[6,6]=-1/.14
C=np.zeros((7,9));C[:,:7]=C7;C[2,7]=1;C[3,8]=1
# Derive IMU Jacobian from the same A to avoid float finite-difference inconsistency.
a=np.array([0,.35]);b=R(x[1])@np.array([-.3,-.85])
C[4:6]=R(x[0]).T@A[4:6]+fraction*(np.outer(cross(a)-cross(b),A[2])-np.outer(cross(b),A[3]))
C[4:6,0]+=9.80665*np.array([np.cos(x[0]),np.sin(x[0])])
# Scale state perturbations: theta/delta .1 rad; rates .2 rad/s; speeds/wind 1 m/s; throttle .1.
scale=np.diag([.1,.1,.2,.2,1,1,.1,1,1]);As=np.linalg.solve(scale,A@scale)
noise=np.array([np.deg2rad(1),np.deg2rad(.2),.15,.15,.2,.2,.3]);results=[]
for name,rows in [('attitude_rate_GPS',[0,1,2,3]),('plus_payload_accelerometers',[0,1,2,3,4,5]),('plus_airspeed',[0,1,2,3,4,5,6])]:
 H=C[rows]@scale/noise[rows,None]
 O=np.vstack([H@np.linalg.matrix_power(As,j) for j in range(9)])
 # PBH at each eigenvalue is numerically safer than high-power O rank.
 checks=[np.linalg.svd(np.vstack([lam*np.eye(9)-As,H]),compute_uv=False)[-1] for lam in np.linalg.eigvals(As)]
 W=np.zeros((9,9));dt=.02
 for t in np.arange(0,5,dt):
  M=H@expm(As*t);W+=M.T@M*dt
 vals=np.linalg.eigvalsh(W);res=dict(measurements=name,PBH_min_singular=float(min(checks)),five_second_gramian_min_eigenvalue=float(vals[0]),gramian_condition=float(vals[-1]/vals[0]))
 results.append(res);print(res)
(r/'assessment.json').write_text(json.dumps(dict(state_order=['theta','delta','qp','qrel','Vair_x','Vair_z','motor','wind_x','wind_z'],A=A.tolist(),C=C.tolist(),checks=results,assumptions='Known calibrated native longitudinal model; constant winds; ideal payload attitude/rate and payload-CG GNSS/accelerometer measurements; illustrative noise scales, not sensor calibration.'),indent=2))
# Stress identifiability: let unknown constant net angular/translation accelerations absorb model error.
Aug=np.zeros((13,13));Aug[:9,:9]=A
for j,i in enumerate([2,3,4,5]):Aug[i,9+j]=1
Ca=np.zeros((7,13));Ca[:,:9]=C;a=np.array([0,.35]);b=R(x[1])@np.array([-.3,-.85])
Ca[4:6,9]=fraction*(cross(a)-cross(b));Ca[4:6,10]=-fraction*cross(b);Ca[4:6,11:13]=R(x[0]).T
stress=[]
for name,rows in [('No airspeed',[0,1,2,3,4,5]),('With scalar airspeed',[0,1,2,3,4,5,6])]:
 H=Ca[rows];matrix=np.vstack([-Aug,H]);rank=np.linalg.matrix_rank(matrix,tol=1e-5)
 print(name,'zero-frequency PBH rank',rank,'of',13,'unobservable constant directions',13-rank)

 stress.append(dict(measurements=name,zero_frequency_rank=int(rank),states=13,unobservable_constant_directions=int(13-rank)))
assessment=json.loads((r/'assessment.json').read_text());assessment['uncertainty_stress']=dict(assumption='Four arbitrary unknown constant net angular/translation acceleration offsets, a deliberately permissive model-error representation.',checks=stress)
(r/'assessment.json').write_text(json.dumps(assessment,indent=2))
