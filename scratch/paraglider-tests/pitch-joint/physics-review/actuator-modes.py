import json,numpy as np
from trim import Physics,root
results=[]
for trim in json.loads((root/'trim.json').read_text()):
 name=trim['model'];p=Physics(name);eq=np.array([trim['theta'],trim['relative'],0,0,trim['V'],0,0,trim['throttle']]);active=list(range(8)) if name=='joint' else [0,2,4,5,6,7]
 modes={}
 for gain in [0,.1,.2,.5,1]:
  def f(y):
   e=p.evaluate(*y[:6],y[7]);demand=np.clip(trim['throttle']-np.clip(gain*y[6],-.25,.25),0,1)
   return np.array([y[2],y[3],e[2],e[3],e[0],e[1],2*np.pi*10*(y[2]-y[6]),(demand-y[7])/.14])
  ds=.0003;a=np.column_stack([(f(eq+np.eye(8)[i]*ds)-f(eq-np.eye(8)[i]*ds))/(2*ds) for i in range(8)])
  eig=np.linalg.eigvals(a[np.ix_(active,active)]);dominant=max(eig,key=lambda e:e.real)
  modes[str(gain)]=dict(real=float(dominant.real),frequency_hz=float(abs(dominant.imag)/(2*np.pi)))
 results.append(dict(model=name,servo_tau_s=.14,modes=modes));p.close()
(root/'actuator-modes.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
