import json
from pathlib import Path
import numpy as np
from scipy.linalg import solve_discrete_are
from scipy.signal import cont2discrete
r=Path(__file__).parent;old=json.loads((r.parent/'oracle-control/design.json').read_text());trim=old['trim'];dt=.02
A=np.zeros((8,8));A[:6,:6]=old['A'];A[:6,6]=old['B'];A[6,6]=-1/.14;A[6,7]=1/.14
B=np.zeros((8,1));B[7,0]=1
C=np.array([[0,0,0,0,0,-1,0,0.]])
ad,bd,_,_,_=cont2discrete((A,B,C,np.zeros((1,1))),dt)
aa=np.zeros((9,9));aa[:8,:8]=ad;aa[8,:8]=dt*C;aa[8,8]=1;ba=np.vstack([bd,[[0.]]])
ref=np.linalg.solve(np.block([[A,B],[C,np.zeros((1,1))]]),np.r_[np.zeros(8),1])
results=[]
for name,qv,qi,qr,R in [('rate-soft',2,1,.3,.2),('rate-medium',8,8,1,.2),('rate-fast',20,20,2,.2)]:
 Q=np.diag([2,2,qr,qr,.2,qv,.1,.1,qi]);P=solve_discrete_are(aa,ba,Q,[[R]]);K=np.linalg.solve(R+ba.T@P@ba,ba.T@P@aa).flatten()
 data=dict(name=name,K=K.tolist(),ref=ref.tolist(),trim=[trim['theta'],trim['relative'],0,0,trim['V'],0,trim['throttle'],trim['throttle']],dt=dt)
 (r/(name+'-gains.json')).write_text(json.dumps(data,indent=2));(r/(name+'-gains.txt')).write_text(' '.join(map(str,np.r_[K,ref,data['trim']]))+'\n');results.append(data);print(name,K)
(r/'rate-design.json').write_text(json.dumps(dict(A=A.tolist(),B=B.tolist(),controllers=results),indent=2))
