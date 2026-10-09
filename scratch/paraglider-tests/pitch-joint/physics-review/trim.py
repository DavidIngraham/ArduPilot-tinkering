import json,subprocess
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
root=Path(__file__).parent
class Physics:
 def __init__(self, model):
  self.p=subprocess.Popen([str(root/'evaluate'),Path(model).name.removesuffix(".json")],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
 def evaluate(self,theta,relative,qp,qr,vx,vz,throttle):
  self.p.stdin.write(' '.join(map(str,[theta,relative,qp,qr,vx,vz,throttle]))+'\n');self.p.stdin.flush()
  while True:
   s=self.p.stdout.readline()
   if s.startswith('E '):return np.array(list(map(float,s.split()[1:])))
   if not s:raise RuntimeError('evaluator exited')
 def close(self):self.p.stdin.close();self.p.wait()

def solve(model):
 p=Physics(root/(model+'.json'));joint=model!='rigid'
 def fun(x):
  v,theta,rel,throttle=x if joint else [x[0],x[1],0,x[2]]
  return p.evaluate(theta,rel,0,0,v,0,throttle)[:4 if model=='joint' else 3]
 best=None
 for theta in [-.2,0,.2]:
  for rel in ([-.6,0,.6] if joint else [0]):
   x0=[5,theta,rel,.5] if joint else [5,theta,.5]
   bounds=([1,-1,-1.5,0],[20,1,1.5,1]) if joint else ([1,-1,0],[20,1,1])
   # A locked joint has fixed relative angle; do not solve the unconstrained angle.
   if model=='locked':
    def lockedfun(x):return p.evaluate(x[1],0,0,0,x[0],0,x[2])[:3]
    res=least_squares(lockedfun,[5,theta,.5],bounds=([1,-1,0],[20,1,1]),diff_step=.001,xtol=1e-9,ftol=1e-9,gtol=1e-9,max_nfev=200)
   else:res=least_squares(fun,x0,bounds=bounds,diff_step=.001,xtol=1e-9,ftol=1e-9,gtol=1e-9,max_nfev=200)
   if best is None or np.linalg.norm(res.fun)<np.linalg.norm(best.fun):best=res
 x=best.x
 v,theta,rel,throttle=x if model=='joint' else [x[0],x[1],0,x[2]]
 result=dict(model=model,V=float(v),theta=float(theta),relative=float(rel),throttle=float(throttle),residual=best.fun.tolist(),evaluation=p.evaluate(theta,rel,0,0,v,0,throttle).tolist())
 p.close();return result
if __name__=='__main__':
 configs={'rigid':{},'joint':{'pitch_joint_enabled':1},'locked':{'pitch_joint_enabled':1,'pitch_joint_locked':1}}
 for name,c in configs.items():(root/(name+'.json')).write_text(json.dumps(c))
 results=[solve(model) for model in configs]
 (root/'trim.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
