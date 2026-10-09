import json
from pathlib import Path
import numpy as np
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
r=Path(__file__).parent;old={m['name']:m for m in json.loads((r.parent/'oracle-control/metrics.json').read_text())};results=[]
scenarios=[('Nominal','snappy-current','snappy-oracle3','step'),('No hinge damping','joint-d0-current','joint-d0-oracle','d0'),('Motor lag 0.25 s','slow-motor-current','slow-motor-oracle','slow-motor'),('Thrust z = −0.20 m','joint-thrust-high-current','joint-thrust-high-oracle','thrust-high')]
fig,ax=plt.subplots(figsize=(11,5),constrained_layout=True)
for j,(label,base,oracle,prefix) in enumerate(scenarios):
 vals=[old[base]['q_payload_rms_deg_s'],old[oracle]['q_payload_rms_deg_s']]
 for n in ['rate-soft','rate-medium']:vals.append(json.loads((r/(prefix+'-'+n+'-metrics.json')).read_text())['q_rms'])
 results.append(dict(scenario=label,existing=vals[0],previous_joint_feedback=vals[1],integrated_conservative=vals[2],integrated_faster=vals[3]))
 for i,(v,color,legend) in enumerate(zip(vals,['tab:orange','tab:purple','tab:green','tab:blue'],['Existing faster TECS','Previous joint feedback','Integrated conservative','Integrated faster'])):
  x=j+(i-1.5)*.2;ax.bar(x,v,width=.19,color=color,label=legend if j==0 else None);ax.text(x,v+.15,f'{v:.2f}',ha='center',fontsize=8)
ax.set_xticks(range(len(scenarios)),[s[0] for s in scenarios]);ax.set_ylabel('Payload pitch-rate RMS (deg/s)');ax.grid(axis='y',alpha=.25);ax.set_ylim(0,12);ax.legend(fontsize=8)
fig.suptitle('Model sensitivity: actual Plane/SITL, same climb/descent maneuvers\nNominal gains retained across each model change; perfect simulated state')
fig.savefig(r/'robustness-comparison.png',dpi=170);fig.savefig(r/'robustness-comparison.pdf')
(r/'robustness-summary.json').write_text(json.dumps(results,indent=2));print(results)
