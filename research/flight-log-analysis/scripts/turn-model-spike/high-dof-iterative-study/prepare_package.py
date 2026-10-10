from pathlib import Path
R=Path(__file__).parent/'candidate-v2'
(R/'build.sh').write_text('#!/bin/sh\nset -eu\ncd "$(dirname "$0")"\ng++ -O3 -std=c++17 -shared -fPIC -I/usr/include/eigen3 dynamics.cpp -o libdynamics.so\n')
(R/'requirements.txt').write_text('numpy>=1.24\nscipy>=1.10\nmatplotlib>=3.6\n')
p=R/'actuator.py';s=p.read_text().replace("if rate_mm_s<=0:","if not np.isfinite(rate_mm_s) or rate_mm_s<=0:").replace('self.rate=float(rate_mm_s);self.position=np.asarray(position_mm,dtype=float).copy()',"self.rate=float(rate_mm_s);self.position=np.asarray(position_mm,dtype=float).copy()\n  if self.position.shape!=(2,) or not np.isfinite(self.position).all():raise ValueError('two finite servo positions required')").replace('target=np.asarray(target_mm,dtype=float);end=',"target=np.asarray(target_mm,dtype=float)\n  if target.shape!=(2,) or not np.isfinite(target).all() or not np.isfinite(dt) or dt<=0:raise ValueError('two finite targets and positive dt required')\n  end=")
p.write_text(s)
