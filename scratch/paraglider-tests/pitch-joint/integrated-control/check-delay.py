import json
from pathlib import Path
import numpy as np
from scipy.signal import cont2discrete
r=Path(__file__).parent;d=json.loads((r/'design.json').read_text());A=np.array(d['A']);B=np.array(d['B']);C=np.array([[0,0,0,0,0,-1,0.]])
results=[]
for c in d['controllers']:
 k=np.array(c['K']);checks=[]
 for tau in [.1,.14,.25]:
  a=A.copy();b=B.copy();a[6,6]=-1/tau;b[6,0]=1/tau
  ad,bd,_,_,_=cont2discrete((a,b,C,np.zeros((1,1))),.02)
  aug=np.zeros((8,8));aug[:7,:7]=ad;aug[7,:7]=.02*C;aug[7,7]=1;bu=np.r_[bd[:,0],0]
  for delay in [0,1,2,3]:
   if delay==0:closed=aug-np.outer(bu,k)
   else:
    closed=np.zeros((8+delay,8+delay));closed[:8,:8]=aug;closed[:8,8]=bu
    closed[-1,:8]=-k
    for j in range(delay-1):closed[8+j,9+j]=1
   checks.append(dict(tau=tau,delay_ms=delay*20,max_pole=float(max(abs(np.linalg.eigvals(closed))))))
 results.append(dict(controller=c['name'],checks=checks));print(c['name'],checks)
(r/'delay-checks.json').write_text(json.dumps(results,indent=2))
