import json
from pathlib import Path
import numpy as np
from scipy.linalg import solve_discrete_are
from scipy.signal import cont2discrete
root=Path(__file__).parent
old=json.loads((root.parent/'oracle-control/design.json').read_text())
A6=np.array(old['A']);B6=np.array(old['B']);trim=old['trim'];dt=.02
A=np.zeros((7,7));A[:6,:6]=A6;A[:6,6]=B6;A[6,6]=-1/.14
B=np.zeros((7,1));B[6,0]=1/.14
C=np.array([[0,0,0,0,0,-1,0.]])
Ad,Bd,_,_,_=cont2discrete((A,B,C,np.zeros((1,1))),dt)
Aa=np.zeros((8,8));Aa[:7,:7]=Ad;Aa[7,:7]=dt*C;Aa[7,7]=1
Ba=np.vstack([Bd,[[0.]]])
ref=np.linalg.solve(np.block([[A,B],[C,np.zeros((1,1))]]),np.r_[np.zeros(7),1])
results=[]
for name,qv,qi,qr,R in [('gentle',2,1,.3,1),('balanced',8,8,1,1),('fast',30,30,2,.5)]:
 Q=np.diag([2,2,qr,qr,.2,qv,.1,qi]);P=solve_discrete_are(Aa,Ba,Q,[[R]])
 K=np.linalg.solve(R+Ba.T@P@Ba,Ba.T@P@Aa).flatten()
 data=dict(name=name,K=K.tolist(),ref=ref.tolist(),trim=[trim['theta'],trim['relative'],0,0,trim['V'],0,trim['throttle']],dt=dt,
           poles=[[float(v.real),float(v.imag)] for v in np.linalg.eigvals(Aa-Ba@K[None,:])])
 (root/(name+'-gains.json')).write_text(json.dumps(data,indent=2))
 (root/(name+'-gains.txt')).write_text(' '.join(map(str,np.r_[K,ref,data['trim']]))+'\n')
 results.append(data);print(name,K)
(root/'design.json').write_text(json.dumps(dict(A=A.tolist(),B=B.tolist(),controllers=results),indent=2))
