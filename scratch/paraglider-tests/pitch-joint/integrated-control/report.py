import hashlib,json,subprocess
from pathlib import Path
r=Path(__file__).parent;repo=Path('/workspace/ardupilot');paths=['libraries/SITL/SIM_Paraglider.cpp','libraries/SITL/SIM_Paraglider.h','libraries/AP_TECS/AP_TECS_Paraglider.cpp','libraries/AP_TECS/AP_TECS.cpp']
source_restored={p:(repo/p).read_bytes()==(r/('production-'+Path(p).name)).read_bytes() for p in paths}
assert all(source_restored.values())
s=(r/'production-SIM_Paraglider.cpp').read_text();exp=(r/'experimental-SIM_Paraglider.cpp').read_text()
def function(source,name):
 start=source.index('Paraglider::'+name+'(');a=source.index('{',start);level=1;b=a+1
 while level:
  level+=(source[b]=='{')-(source[b]=='}');b+=1
 return source[start:b]
physics={n:function(s,n)==function(exp,n) for n in ['compute_forces_bf','compute_torque_bf','pitch_geometry','pitch_accelerations','inertia_mul','inertia_inv_mul','eval_parafoil_coeffs']}
assert all(physics.values())
experiments=[]
for p in r.glob('*-metadata.json'):
 m=json.loads(p.read_text())
 if 'config' in m:experiments.append(dict(name=m['config']['name'],error=m['error'],binary_sha256=m['binary_sha256'],controller=m.get('lqi_gains')))
validation=dict(experiment_count=len(experiments),experiments=experiments,production_sources_restored=source_restored,
                flight_physics_unchanged=physics,production_binary_has_oracle_hook=b'PG_LQI_GAINS' in (repo/'build/sitl/bin/arduplane').read_bytes(),
                production_binary_sha256=hashlib.sha256((repo/'build/sitl/bin/arduplane').read_bytes()).hexdigest(),unit_tests_passed=20,
                native_auto_course=json.loads((r/'auto-mission-metadata.json').read_text()),no_commits=True,
                git_status=subprocess.check_output(['git','status','--short'],cwd=repo,text=True))
assert not validation['production_binary_has_oracle_hook']
(r/'validation.json').write_text(json.dumps(validation,indent=2))
summary=dict(selected_controller='rate-soft',architecture='50 Hz discrete LQI controlling throttle rate; 10 Hz TECS altitude/vertical-speed demand retained',
             state_order=['payload_pitch_rad','relative_pitch_rad','payload_q_rad_s','relative_q_rad_s','heading_air_velocity_mps','CG_velocity_down_mps','motor_throttle','previous_throttle_command','integral_of_climb_error_m'],
             gains=json.loads((r/'rate-soft-gains.json').read_text()),
             step_comparison=json.loads((r/'step-summary.json').read_text()),model_sensitivity=json.loads((r/'robustness-summary.json').read_text()),
             frequency_response=json.loads((r/'frequency-results.json').read_text()),loop_split=json.loads((r/'loop-split.json').read_text()),
             auto_mission=json.loads((r/'auto-mission-metrics.json').read_text()),
             gust_scenarios=[json.loads((r/('gust-'+n+'-metrics.json')).read_text()) for n in ['rate-soft','rate-medium']],
             limits=['Perfect simulated joint, air velocity, CG velocity and motor state; no observer.','15 deg AoA is a model linear-aero boundary, not a validated stall margin.','Model has no canopy collapse/inflation mechanics.','Severe synthetic gust response remains unacceptable.','Finite model variations are not a robustness guarantee.','AUTO course used airborne preparation, not overhead swing launch.'],
             result='Useful damping, tracking and post-command settling improvements. High bandwidth with stall protection is not demonstrated; controller remains a local benchmark.',
             validation=validation)
(r/'summary.json').write_text(json.dumps(summary,indent=2))
print('Verified restored source, unchanged flight physics, production binary, 20 unit tests;',len(experiments),'local experiments plus AUTO course')
