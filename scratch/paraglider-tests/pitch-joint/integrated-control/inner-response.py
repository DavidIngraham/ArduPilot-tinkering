import json
from pathlib import Path
import numpy as np
from scipy.signal import cont2discrete
r=Path(__file__).parent;d=json.loads((r/'rate-design.json').read_text());A=np.array(d['A'])[:7,:7];B=np.zeros((7,1));B[6,0]=1/.14;C=np.array([[0,0,0,0,0,-1,0.]])
ad,bd,_,_,_=cont2discrete((A,B,C,np.zeros((1,1))),.02);results=[]
for n in ['rate-soft','rate-medium']:
 g=json.loads((r/(n+'-gains.json')).read_text());k=np.array(g['K']);ref=np.array(g['ref'])
 M=np.zeros((9,9));M[:7,:7]=ad;M[:7,7]=bd[:,0];M[7,7]=1;M[8,:7]=.02*C;M[8,8]=1
 # Command increment affects the plant during this sample, not the next one.
 Bu=np.r_[.02*bd[:,0],.02,0];M-=np.outer(Bu,k);Br=Bu*(k[:8]@ref[:8]);Br[8]-=.02
 out=np.r_[C[0],0,0];bands=[]
 for f in [.08,.16,.32,.64,1]:
  h=out@np.linalg.solve(np.exp(2j*np.pi*f*.02)*np.eye(9)-M,Br)
  bands.append(dict(frequency_hz=f,gain=float(abs(h)),phase_deg=float(np.angle(h)*180/np.pi)))
 results.append(dict(name=n,bands=bands));print(n,bands)
(r/'predicted-inner-response.json').write_text(json.dumps(results,indent=2))
