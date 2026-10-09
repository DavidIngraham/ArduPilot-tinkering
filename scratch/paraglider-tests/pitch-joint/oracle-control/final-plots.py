# AP_FLAKE8_CLEAN
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).parent
rows={r['name']:r for r in json.loads((root/'metrics.json').read_text())}
categories=[('Default','current-tecs','default-oracle3'),('Faster PI','snappy-current','snappy-oracle3'),
            ('No joint damping','joint-d0-current','joint-d0-oracle'),
            ('Higher thrust line','joint-thrust-high-current','joint-thrust-high-oracle'),
            ('Thrust at payload CG','joint-thrust-low-current','joint-thrust-low-oracle'),
            ('Slower motor','slow-motor-current','slow-motor-oracle')]
fig,axes=plt.subplots(1,2,figsize=(13,5),constrained_layout=True)
x=np.arange(len(categories))
for offset,col,label,index in [(-.18,'tab:orange','Existing payload-rate damper',1),(.18,'tab:blue','True-state feedback',2)]:
 values=[rows[c[index]]['q_payload_rms_deg_s'] for c in categories]
 axes[0].bar(x+offset,values,.35,color=col,label=label)
for ax in axes:ax.grid(axis='y',alpha=.25);ax.set_axisbelow(True)
axes[0].set_xticks(x,[c[0] for c in categories],rotation=25,ha='right')
axes[0].set_ylabel('Payload pitch-rate RMS (deg/s)')
axes[0].legend(fontsize=9)
ablations=[('Payload only: best tested gain','snappy-payload-k0.2'),('Payload only: matched rate gain','snappy-payload-rate-only'),('Angle + payload rate','snappy-angle-only'),
           ('Relative + payload rates','snappy-rate-only'),('Angle + both rates','snappy-oracle3')]
axes[1].bar(range(len(ablations)),[rows[name]['q_payload_rms_deg_s'] for label,name in ablations],color=['#f39c35','#c88b32','#a2a2a2','#448dc5','#1769aa'])
axes[1].set_xticks(range(len(ablations)),[label for label,name in ablations],rotation=25,ha='right')
axes[1].set_ylabel('Payload pitch-rate RMS (deg/s)')
axes[1].set_title('Ablation + tuned payload-only reference; same PI')
fig.suptitle('Actual Plane TECS: true relative-rate information adds useful damping\n'
             'Calm matched maneuvers; fixed gains; no stall constraint; motor lag and throttle limits retained',fontsize=12)
fig.savefig(root/'damping-and-ablation.png',dpi=180);fig.savefig(root/'damping-and-ablation.pdf')
# Explicit numerical summary; do not present the single gust comparison as a calibrated result.
summary=dict(controller=dict(ka=-.6499230155808919,kr=.5597538582763202,kq=.39631840655290995,
                             correction_limit=.25,angle_washout_s=2,rate_filter_hz=10,feedback_update_hz=50,
                             nominal_motor_time_constant_s=.14),
             nominal_comparisons=[dict(scenario=c[0],baseline=rows[c[1]],oracle=rows[c[2]]) for c in categories],
             ablations=[dict(label=label,metrics=rows[name]) for label,name in ablations],
             gust_stress=[rows[n] for n in ['gusty-current','gusty-oracle']],
             aggressive_failures=[rows[n] for n in ['upper-current','upper-oracle','upper-rate-only','fast-oracle3']],
             scope='Local experimental binary with simulated state feedback into motor command; not flight firmware.',
             limitations=['Limited controller family, not an optimal achievable-bandwidth bound.',
                          'No observer, canopy AoA protection, or uncertainty-aware command governor.',
                          'Model stall blend and joint geometry remain provisional.',
                          'Single gust trial per controller; not paired replay or a calibrated wind spectrum.',
                          'Both fast-feedback and gust stress cases exhibit unacceptable pitch motion.',
                          'All airborne-prepared cruise experiments; no realistic inflation/launch validation.'])
existing=json.loads((root/'summary.json').read_text()) if (root/'summary.json').exists() else {}
summary=dict(existing,**summary)
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
