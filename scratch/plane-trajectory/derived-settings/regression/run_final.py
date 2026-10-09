"""Local orchestration of the requested recorded flight comparisons."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT=Path(__file__).resolve().parent
REPO=Path('/workspace/ardupilot-plane-trajectory')
sha=hashlib.sha256((REPO/'build/sitl/bin/arduplane').read_bytes()).hexdigest()
env=os.environ.copy();env['PYTHONPATH']='/tmp/paraglider-python-deps';env['PATH']='/tmp/paraglider-python-deps/bin:'+env['PATH'];env['PYTHONUNBUFFERED']='1'
print('Starting final native regressions',flush=True)
with (ROOT/'torture-run-final.log').open('w') as log:
 for tests in [('test.Plane.WaypointLineRadiusIndependence',), ('test.Plane.WaypointLineTrajectory','test.Plane.MainFlight')]:
  result=subprocess.run([sys.executable,'Tools/autotest/autotest.py','--speedup','20',*tests],cwd=REPO,env=env,stdout=log,stderr=subprocess.STDOUT)
  if result.returncode:raise SystemExit(result.returncode)
(ROOT/'torture').mkdir(exist_ok=True)
for path in Path('/workspace/buildlogs').glob('WaypointLineTrajectory-*'):
 destination=ROOT/'torture'/path.name;shutil.copy2(path,destination)
 if path.suffix=='.json':
  meta=json.loads(destination.read_text());meta['binary_sha256']=sha;destination.write_text(json.dumps(meta,indent=2))
print('Native tests passed; starting six raster flights',flush=True)
with (ROOT/'raster'/'run-final.log').open('w') as log:
 result=subprocess.run([sys.executable,str(ROOT/'raster'/'run_cases.py')],cwd=REPO,env=env,stdout=log,stderr=subprocess.STDOUT)
(ROOT/'validation.json').write_text(json.dumps(dict(binary_sha256=sha,native_returncode=0,raster_returncode=result.returncode,source_sha256={str(p):hashlib.sha256((REPO/p).read_bytes()).hexdigest() for p in ('ArduPlane/PlaneTrajectory.cpp','ArduPlane/PlaneTrajectory.h','ArduPlane/navigation.cpp','ArduPlane/commands.cpp','ArduPlane/tests/test_plane_trajectory.cpp','Tools/autotest/arduplane.py')}),indent=2))
print('Raster return code',result.returncode,flush=True)
raise SystemExit(result.returncode)
