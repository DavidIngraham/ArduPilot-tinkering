# AP_FLAKE8_CLEAN
import json
from pathlib import Path
import subprocess
import sys
root = Path(__file__).parent
results = []
for name in ('joint-calm-g0', 'joint-calm-g0.2', 'rigid-calm-g0.2', 'joint-rampwind-g0', 'joint-rampwind-g0.2', 'rigid-rampwind-g0.2'):
    with (root / (name + '.txt')).open('w') as log:
        try:
            result = subprocess.run([sys.executable, '-u', str(root / 'run.py'), str(root / (name + '-config.json'))],
                                    stdout=log, stderr=subprocess.STDOUT, timeout=360)
            code = result.returncode
        except subprocess.TimeoutExpired:
            code = 'timeout'
    results.append(dict(name=name, returncode=code))
    (root / 'batch-results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(name, code, flush=True)
