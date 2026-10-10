from pathlib import Path
import sys,json,hashlib,platform,subprocess,datetime,zipfile
import numpy,scipy,matplotlib
R=Path(__file__).parent;P=R/'candidate-v3';sys.path.insert(0,str(P));from profiles import make_simulator
import dynamics
serial=lambda v:v.tolist() if hasattr(v,'tolist') else v
snapshots=[]
for flight in ['hood_river','trout_lake']:
 for profile in ['mission','dynamic_roll']:
  s=make_simulator(flight,profile);snapshots.append(dict(flight=flight,profile=profile,geometry={k:serial(v) for k,v in s.geometry.items() if k!='parameters'},parameters=s.parameters,integration_parameter_order=dynamics.KEYS,integration_parameters=dynamics.params(s.parameters).tolist(),substeps=s.substeps))
(P/'resolved-configurations.json').write_text(json.dumps(snapshots,indent=2))
prov=json.loads((P/'configuration-provenance.json').read_text());prov['status']='Co-retained research model family; isolated build, API, replay and controller diagnostics verified';prov['profiles']={'mission':'Default Simulator: stronger ordinary trajectory agreement.','dynamic_roll':'profiles.make_simulator(..., dynamic_roll): roll stiffness1 N m/rad with model-derived level trim correction; stronger fast roll response, stronger powered-HR instability.'};prov['dynamic_roll']={'roll_stiffness_Nm_rad':1.,'hood_river_right_offset_m':-.005482288179747503,'trout_lake_right_offset_m':.0009301618779636765};prov['evidence']=['../retained-summary.json','../soft-v3-atlas-results.json','../soft-retrim-spectra-summary.json','../soft-roll-ridge-phase-check.json','../fresh-package-check.json'];(P/'configuration-provenance.json').write_text(json.dumps(prov,indent=2))
license_source=Path('/home/david/repos/ardupilot/COPYING.txt')
if license_source.exists():(P/'COPYING-controllers.txt').write_bytes(license_source.read_bytes())
(P/'SOURCE-NOTES.txt').write_text('''Research source snapshot,10 October2026.\n\nThe two-body dynamics and model configuration are the local parafoil research\nimplementation retained from this study. The embedded APC9x4.5 aerodynamic\nmap is a proxy for the user-reported actual propeller; see the study report.\n\ncontrollers.py contains a diagnostic core port of ArduPilot\nArduPlane/PG_TurnController.cpp from commit\nb2f6da3a183a68d3de6f2c721ec90fca0eab53d5. That controller code is GPL-3.0-or-later;\nthe accompanying source license is copied as COPYING-controllers.txt when\navailable in the source checkout. This package is not a production firmware\nrelease and does not include the navigation/EKF implementation.\n\nThe build scripts compile only the local dynamics.cpp. No production repository\nfiles are edited. resolved-configurations.json records complete mission and\ndynamic-roll profiles; raw parameters.json alone is not a configured model.\n''')
retained=dict(name='candidate-v3 model family',status='Retained research handoff',profiles=prov['profiles'],primary_package='candidate-v3',report='report.html',metrics='retained-summary.json',dynamic_metrics='soft-v3-atlas-results.json',limitations=['Early TL wrong-direction bias','Missing low-band yaw and incomplete cross-axis phase','Powered HR equilibrium instability, stronger in dynamic_roll','No independent-flight validation','Not a minimum-radius or open-loop mission predictor'])
(R/'retained-candidate.json').write_text(json.dumps(retained,indent=2));(R/'progress.json').write_text(json.dumps(dict(stage='Final review and handoff',retained=retained,completed=['98-window public-package replay','Per-flight PWM audit','Modal/geometry/rotor experiments','Coupled roll-stiffness/trim comparisons','Independent reviewer critiques','Matched early/late and continuous TL diagnostics','Ideal-sensor controller robustness','Fresh isolated build/API/trim verification','Report and reproducible source package'],remaining=['Final reviewer response','Visual/link checks','Goal completion']),indent=2))
files=[]
for p in sorted(P.iterdir()):
 if p.is_file() and p.name not in ['demo.npz','mission-demo.npz','mission-demo.json']:
  files.append(dict(path=str(p.relative_to(R)),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
inputs=[]
for day in ['2026-01-03','2026-02-15']:
 for suffix in ['causal-input.npz','propulsion-9x45.npz']:
  p=R.parent/f'{day}-{suffix}';inputs.append(dict(path=str(p.relative_to(R.parent)),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
manifest=dict(generated_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),platform=platform.platform(),python=sys.version,numpy=numpy.__version__,scipy=scipy.__version__,matplotlib=matplotlib.__version__,compiler=subprocess.check_output(['g++','--version'],text=True).splitlines()[0],package_files=files,flight_derived_inputs=inputs,reproduction='Run verify_retained_replays.py beside this manifest in the original study tree. Raw flight-derived npz inputs and archived baselines remain in the parent analysis tree; portable package runs synthetic scenarios without them.')
manifest['study_sources']=[dict(path=str(p.relative_to(R)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(R.glob('*.py'))]
manifest['key_evidence']=[dict(path=n,sha256=hashlib.sha256((R/n).read_bytes()).hexdigest()) for n in ['report.html','retained-summary.json','candidate-v3-atlas-results.json','soft-v3-atlas-results.json','sustained-turn-crosscheck.json','soft-retrim-spectra-summary.json','soft-roll-ridge-phase-check.json','tl-matched-diagnostic.json','tl-continuous-diagnostic.json','v3-robust-results.json','fresh-package-check.json','reviewer-handoff.json']]
(R/'reproducibility-manifest.json').write_text(json.dumps(manifest,indent=2))
with zipfile.ZipFile(R/'candidate-v3-portable.zip','w',zipfile.ZIP_DEFLATED) as z:
 for item in files:z.write(R/item['path'],item['path'])
 z.write(R/'reproducibility-manifest.json','reproducibility-manifest.json')
print('Packaged',len(files),'files;', (R/'candidate-v3-portable.zip').stat().st_size,'bytes')
