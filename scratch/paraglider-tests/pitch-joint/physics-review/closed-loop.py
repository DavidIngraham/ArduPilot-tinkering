# AP_FLAKE8_CLEAN
# Local-only: actual Plane TECS with explicitly airborne-initialized production physics.
import csv,hashlib,json,runpy,shutil,sys
import importlib.util
from pathlib import Path
repo=Path('/workspace/ardupilot');root=Path(__file__).parent
config=json.loads(Path(sys.argv[1]).read_text());sys.path.insert(0,str(repo/'Tools/autotest'))
import arduplane
spec=importlib.util.spec_from_file_location('airborne',root/'airborne-fixture.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)

def experiment(self):
 records=[];latest={};error=None;metadata={}
 old_set=self.set_parameters
 def set_parameters(parameters,*args,**kwargs):
  parameters=dict(parameters)
  if 'TKOFF_ALT' in parameters:parameters['TKOFF_THR_DELAY']=0
  return old_set(parameters,*args,**kwargs)
 self.set_parameters=set_parameters
 def observe(mav,m):
  latest[m.get_type()]=m.to_dict()
  if m.get_type()=='ATTITUDE':records.append(dict(t=m.time_boot_ms/1000,pitch=m.pitch,q=m.pitchspeed,roll=m.roll,altitude=latest.get('GLOBAL_POSITION_INT',{}).get('relative_alt',0)/1000,pwm=latest.get('SERVO_OUTPUT_RAW',{}).get('servo3_raw',0)))
 self.install_message_hook(observe)
 try:
  fixture.prepare(self,config['model'],0)
  self.change_mode('FBWB');self.set_rc_from_map({1:1500,2:1500,3:1500,4:1500})
  self.set_parameters({'SIM_WIND_SPD':0,'SIM_WIND_TURB':0})
  self.set_message_rate_hz('ATTITUDE',25);self.set_message_rate_hz('SERVO_OUTPUT_RAW',25)
  self.delay_sim_time(35,reason='settle actual TECS after airborne initialization')
  if config.get('physics_rate'):
   self.set_parameter('SIM_RATE_HZ',config['physics_rate']);self.delay_sim_time(3,reason='settle changed physics timestep')
  self.set_parameter('TECS_PTCH_DAMP',config['gain']);metadata['start']=self.get_sim_time()
  metadata['parameters']=self.get_parameters(['TECS_PTCH_DAMP','TECS_PG_PR_FILT','SIM_RATE_HZ'])
  if config.get('wind'):
   for step in range(1,11):
    self.set_parameters({'SIM_WIND_SPD':config['wind']*step/10,'SIM_WIND_DIR':45,'SIM_WIND_TURB':config.get('turbulence',0)*step/10})
    self.delay_sim_time(3,reason='ramp wind')
  self.set_rc(2,1400);self.delay_sim_time(2,reason='matched pilot climb perturbation');self.set_rc(2,1500)
  metadata['perturbation_end']=self.get_sim_time()
  self.delay_sim_time(100,reason='observe actual TECS feedback')
  metadata['end']=self.get_sim_time()
  final=self.assert_receive_message('GLOBAL_POSITION_INT')
  if not 20<final.relative_alt*.001<130:raise RuntimeError('closed-loop experiment exceeded altitude bounds')
  self.disarm_vehicle(force=True)
 except Exception as exc:error=repr(exc);raise
 finally:
  self.remove_message_hook(observe)
  self.set_parameters=old_set
  if records:
   with (root/(config['name']+'.csv')).open('w') as f:
    w=csv.DictWriter(f,fieldnames=records[0].keys());w.writeheader();w.writerows(records)
  dest=root/(config['name']+'-logs');dest.mkdir(exist_ok=True)
  for f in (repo/'logs').glob('*.BIN'):shutil.copy2(f,dest/f.name)
  metadata.update(config=config,error=error,binary_sha256=hashlib.sha256((repo/'build/sitl/bin/arduplane').read_bytes()).hexdigest(),airborne_initialization=True)
  (root/(config['name']+'-metadata.json')).write_text(json.dumps(metadata,indent=2))
  self.reset_SITL_commandline()
experiment.__name__='ParagliderAutoMission';experiment.__doc__='Local actual-TECS airborne experiment; not a launch test'
arduplane.AutoTestPlane.ParagliderAutoMission=experiment
sys.argv=[str(repo/'Tools/autotest/autotest.py'),'--speedup','10','test.Plane.ParagliderAutoMission']
runpy.run_path(sys.argv[0],run_name='__main__')
