# AP_FLAKE8_CLEAN
import json,sys
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).parent.parent/'physics-review'))
from trim import Physics
root=Path(__file__).parent
trim=next(r for r in json.loads((root.parent/'physics-review/trim.json').read_text()) if r['model']=='joint')
p=Physics('joint')
x=np.array([trim['theta'],trim['relative'],0,0,trim['V'],0])
def f(x,u):
 e=p.evaluate(*x,u)
 return np.array([x[2],x[3],e[2],e[3],e[0],e[1]])
h=.0005
A=np.column_stack([(f(x+np.eye(6)[i]*h,trim['throttle'])-f(x-np.eye(6)[i]*h,trim['throttle']))/(2*h) for i in range(6)])
B=(f(x,trim['throttle']+h)-f(x,trim['throttle']-h))/(2*h)
p.close()
# Motor lag .14 s; angle washout 2 s; rate LPF 10 Hz. Feedback u=-ka*(delta-w)-kr*qr_lpf.
def matrix(ka,kr):
 M=np.zeros((9,9));M[:6,:6]=A;M[:6,6]=B
 M[6,6]=-1/.14;M[6,1]=-ka/.14;M[6,7]=ka/.14;M[6,8]=-kr/.14
 M[7,1]=.5;M[7,7]=-.5;M[8,3]=2*np.pi*10;M[8,8]=-2*np.pi*10
 return M
best=[]
for ka in np.linspace(-2,2,161):
 for kr in np.linspace(-.8,.8,161):
  e=np.linalg.eigvals(matrix(ka,kr))
  if max(e.real)>=0:continue
  modes=e[np.abs(e.imag)>.1]
  damping=min(-v.real/abs(v) for v in modes)
  best.append((damping,float(ka),float(kr),float(max(e.real))))
best.sort(reverse=True)
result=dict(trim=trim,A=A.tolist(),B=B.tolist(),baseline_eigenvalues=[[v.real,v.imag] for v in np.linalg.eigvals(matrix(0,0))],best=best[:10])
(root/'design.json').write_text(json.dumps(result,indent=2)+'\n')
print('Best damping, angle gain, rate gain, slowest decay:',best[:5])
print('Baseline poles:',np.linalg.eigvals(matrix(0,0)))
