import csv,hashlib,json,pathlib,shutil,subprocess
root=pathlib.Path('/workspace/scratch/plane-trajectory');repo=pathlib.Path('/workspace/ardupilot-plane-trajectory');table=[];flights=[]
for wind in (0,5,10):
 times={}
 for label,prefix,controller in [('L1','WaypointLineTrajectory','L1'),('previous','WaypointTrajectoryOverfly','planned'),('line','WaypointLineTrajectory','planned')]:
  stem=f'{prefix}-{controller}-wind{wind}'
  meta=json.loads((root/(stem+'.json')).read_text());times[label]=meta['metrics']['course_duration_s']
  if label!='previous':
   assert meta['metrics'] is not None
   if label=='line':
    assert not meta['fallbacks']
    covered=set()
    for group in meta['planned_groups']:
     words=group.split();first,count=int(words[2]),int(words[4]);covered.update(range(first,first+count))
    assert {12,13,14}.issubset(covered)
   flights.append(dict(name=stem,metadata=meta))
 table.append(dict(wind_mps=wind,L1_s=round(times['L1'],1),previous_planner_s=round(times['previous'],1),line_planner_s=round(times['line'],1),line_saved_percent=round(100*(1-times['line']/times['L1']),1)))
for p in pathlib.Path('/workspace/buildlogs').glob('WaypointLineRadius*'):
 if p.suffix in ('.csv','.json'):shutil.copyfile(p,root/p.name)
files=['ArduPlane/PlaneTrajectory.cpp','ArduPlane/PlaneTrajectory.h','ArduPlane/navigation.cpp','ArduPlane/tests/test_plane_trajectory.cpp','Tools/autotest/arduplane.py']
report=dict(base_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),
 source_sha256={name:hashlib.sha256((repo/name).read_bytes()).hexdigest() for name in files},
 objective='Wind-aware joins between ground-track lines, independent of ordinary waypoint acceptance radii. Explicit pass-by waypoints remain boundaries.',
 validation=dict(course_test='WaypointLineTrajectory PASS: six flights',radius_test='WaypointLineRadiusIndependence PASS: two flights',standard_plane_test='MainFlight PASS',unit_tests=6,feature_disabled_syntax_checks=['navigation.cpp','PlaneTrajectory.cpp']),
 timing='AUTO handover to terminal-loiter sequence, excluding takeoff and post-mission observation',
 limitations=['Single flight per condition; uniform wind, zero turbulence.','The 10 m/s transition merges WP12-13 and replaces that internal leg; flight-time savings include route shortening.','High-wind tracking/recovery excursion near WP17 remains.','Unsupported/infeasible plans retain legacy L1 fallback.','Bounded four-family turn-straight-turn solver; no roll-state dynamics or continuous replanning yet.'],
 table=table,flights=flights)
(root/'line-transition-validation.json').write_text(json.dumps(report,indent=2))
with (root/'line-transition-flight-times.csv').open('w') as f:
 writer=csv.DictWriter(f,fieldnames=table[0].keys());writer.writeheader();writer.writerows(table)
print(json.dumps(table,indent=2))
