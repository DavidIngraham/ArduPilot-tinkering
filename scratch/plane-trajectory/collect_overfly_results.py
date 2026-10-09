import csv, hashlib, json, pathlib, shutil, subprocess
root = pathlib.Path('/workspace/scratch/plane-trajectory')
repo = pathlib.Path('/workspace/ardupilot-plane-trajectory')
rows = []
flights = []
for profile in ('WaypointTrajectory', 'WaypointTrajectoryOverfly'):
    for wind in (0, 5):
        times = {}
        for controller in ('L1', 'planned'):
            stem = '%s-%s-wind%d' % (profile, controller, wind)
            if profile.endswith('Overfly'):
                for extension in ('.csv', '.json'):
                    shutil.copyfile('/workspace/buildlogs/' + stem + extension, root / (stem + extension))
            meta = json.loads((root / (stem + '.json')).read_text())
            with (root / (stem + '.csv')).open() as source:
                samples = list(csv.DictReader(source))
            terminal = len(meta['route']) + 1
            times[controller] = next(float(r['time_s']) for r in samples if int(r['seq']) == terminal) - float(samples[0]['time_s'])
            if profile.endswith('Overfly'):
                assert set(meta['passby_distances']) == {'3', '6', '9', '15'}
                assert set(meta['protected_crossings_m']) == set(meta['passby_distances'])
            flights.append(dict(name=stem, course_duration_s=times[controller], metadata=meta))
        rows.append(dict(course='mixed overfly' if profile.endswith('Overfly') else 'fly-by', wind_mps=wind,
                         L1_s=round(times['L1'], 1), planned_s=round(times['planned'], 1),
                         saved_s=round(times['L1'] - times['planned'], 1),
                         saved_percent=round(100 * (1 - times['planned'] / times['L1']), 1)))
with (root / 'course-flight-times.csv').open('w') as out:
    writer = csv.DictWriter(out, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
files = ['ArduPlane/navigation.cpp', 'ArduPlane/PlaneTrajectory.h', 'ArduPlane/tests/test_plane_trajectory.cpp', 'Tools/autotest/arduplane.py']
report = dict(base_commit=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip(),
              source_sha256={name: hashlib.sha256((repo/name).read_bytes()).hexdigest() for name in files},
              timing_definition='First recorded AUTO handover position to first terminal-loiter mission sequence; excludes takeoff and post-mission loiter observation.',
              original_course_provenance='Previous matched flight sweep; timing recomputed from retained CSV with the updated metric.',
              mixed_course_validation='Final native WaypointTrajectoryOverfly: four flights, calm and 5 m/s from 45 degrees, turbulence zero.',
              unit_tests=5, feature_disabled_syntax_checks=['navigation.cpp', 'PlaneTrajectory.cpp'],
              table=rows, flights=flights)
(root / 'overfly-validation.json').write_text(json.dumps(report, indent=2))
print(json.dumps(rows, indent=2))
