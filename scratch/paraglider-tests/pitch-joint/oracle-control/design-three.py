# AP_FLAKE8_CLEAN
import json
from pathlib import Path
import numpy as np
from scipy.optimize import differential_evolution
root=Path(__file__).parent
base=json.loads((root/'design.json').read_text());A=np.array(base['A']);B=np.array(base['B'])
def matrix(ka,kr,kq,tau=.14):
 M=np.zeros((10,10));M[:6,:6]=A;M[:6,6]=B
 M[6,6]=-1/tau;M[6,1]=-ka/tau;M[6,7]=ka/tau;M[6,8]=-kr/tau;M[6,9]=-kq/tau
 M[7,1]=.5;M[7,7]=-.5
 M[8,3]=2*np.pi*10;M[8,8]=-2*np.pi*10
 M[9,2]=2*np.pi*10;M[9,9]=-2*np.pi*10
 return M
def cost(k):
 scores=[]
 for tau in [.10,.14,.25]:
  e=np.linalg.eigvals(matrix(*k,tau));maxreal=max(e.real)
  if maxreal>=0:return 100+maxreal
  modes=e[abs(e.imag)>.1];scores.append(min(-v.real/abs(v) for v in modes))
 return -min(scores)+.005*np.linalg.norm(k)
r=differential_evolution(cost,[(-5,3),(-1,1),(-1,1)],seed=42,tol=1e-7)
result=dict(gains=r.x.tolist(),objective=float(r.fun),poles_nominal=[[v.real,v.imag] for v in np.linalg.eigvals(matrix(*r.x))])
(root/'design-three.json').write_text(json.dumps(result,indent=2))
print(result)
