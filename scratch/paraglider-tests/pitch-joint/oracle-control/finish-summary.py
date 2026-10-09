# AP_FLAKE8_CLEAN
import json
from pathlib import Path
root=Path(__file__).parent
summary=json.loads((root/'summary.json').read_text())
metrics={x['name']:x for x in json.loads((root/'metrics.json').read_text())}
summary['same_rate_payload_gain_sweep']=[metrics[f'snappy-payload-k{k}'] for k in [0,.1,.2,.3]]
summary['same_rate_payload_best_of_tested_gains']=min(summary['same_rate_payload_gain_sweep'],key=lambda x:x['q_payload_rms_deg_s'])
summary['frequency_comparison']=json.loads((root/'frequency-selected.json').read_text())
summary['plant_zeros']=json.loads((root/'plant-zeros.json').read_text())
summary['plant_zero_interpretation']='Payload pitch has a nominal right-half-plane zero; system-CG climb rate does not. Pitch inverse response does not establish a fundamental climb-bandwidth limit.'
summary['decision']='True relative-rate information adds damping; relative-angle feedback contributes little in these cruise cases. No large usable tracking-bandwidth increase or stall protection demonstrated.'
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
