# AP_FLAKE8_CLEAN
import csv,hashlib,importlib.util,json,math,os,runpy,shutil,sys
from pathlib import Path
root=Path(__file__).parent
repo=Path('/workspace/ardupilot')
config=json.loads(Path(sys.argv[1]).read_text())
sys.path.insert(0,str(repo/'Tools/autotest'))
import arduplane
spec=importlib.util.spec_from_file_location('fixture',root/'airborne-fixture.py')
fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)

def experiment(self):
 records=[];latest={};metadata=dict(config=config);error=None
 def observe(mav,m):
  latest[m.get_type()]=m.to_dict()
  if m.get_type()=='ATTITUDE':
   gp=latest.get('GLOBAL_POSITION_INT',{});servo=latest.get('SERVO_OUTPUT_RAW',{});hud=latest.get('VFR_HUD',{})
   records.append(dict(t=m.time_boot_ms/1000,pitch=m.pitch,q=m.pitchspeed,roll=m.roll,
                       altitude=gp.get('relative_alt',0)/1000,climb=-gp.get('vz',0)/100,
                       pwm=servo.get('servo3_raw',0),airspeed=hud.get('airspeed',0)))
 self.install_message_hook(observe)
 try:
  fixture.prepare(self,config.get('model','joint'),0)
  self.set_message_rate_hz('ATTITUDE',25);self.set_message_rate_hz('SERVO_OUTPUT_RAW',25)
  self.set_message_rate_hz('GLOBAL_POSITION_INT',25)
  self.set_parameters(dict(TECS_PTCH_DAMP=config.get('damper',0),**config['parameters']))
  self.delay_sim_time(35,reason='settle tested controller with oracle correction')
  metadata['parameters']=self.get_parameters(['TECS_PTCH_DAMP','TECS_TIME_CONST','TECS_HDEM_TCONST',
                                             'TECS_VERT_ACC','SIM_SERVO_SPEED','THR_SLEWRATE','RC2_REVERSED',
                                             'SIM_RATE_HZ','TECS_INTEG_GAIN'])
  if config.get('turbulence'):
   self.set_parameters({'SIM_WIND_SPD':3,'SIM_WIND_DIR':45,'SIM_WIND_TURB':config['turbulence']})
   self.delay_sim_time(15,reason='settle wind')
  events=[]
  if config.get('frequencies'):
   self.context_set_speedup(config.get('speedup',10))
   metadata['actual_frequency_speedup']=self.get_parameter('SIM_SPEEDUP')
   self.delay_sim_time(3,reason='settle command generator timing')
   self.set_parameter('RC2_DZ',0)
   for frequency,cycles in config['frequencies']:
    start=self.get_sim_time();duration=cycles/frequency
    events.append(dict(label='frequency',t=start,duration=duration,frequency_hz=frequency))
    previous=-1
    while True:
     m=self.assert_receive_message('ATTITUDE',timeout=2)
     t=m.time_boot_ms*.001-start
     if t>=duration:break
     if t-previous>=.05:
      previous=t
      desired=.2+.1*math.sin(2*math.pi*frequency*t)
      self.set_rc_from_map({2:int(round(1500+500*desired/2))},timeout=None)
   self.set_rc(2,1500);self.delay_sim_time(10,reason='end frequency sweep')
  else:
   for label,pwm,duration in [('descent',1400,6),('hold-after-descent',1500,12),('climb',1600,6),('hold-after-climb',1500,35)]:
    events.append(dict(label=label,t=self.get_sim_time(),pwm=pwm,duration=duration))
    self.set_rc(2,pwm);self.delay_sim_time(duration,reason='matched longitudinal maneuver: '+label)
  metadata['events']=events
  metadata['end']=self.get_sim_time()
  final=self.assert_receive_message('GLOBAL_POSITION_INT')
  if not 20<final.relative_alt*.001<150:raise RuntimeError('altitude bounds exceeded')
  self.disarm_vehicle(force=True)
 except Exception as exc:
  error=repr(exc);raise
 finally:
  self.remove_message_hook(observe)
  if records:
   with (root/(config['name']+'.csv')).open('w') as f:
    w=csv.DictWriter(f,fieldnames=records[0].keys());w.writeheader();w.writerows(records)
  destination=root/(config['name']+'-logs');destination.mkdir(exist_ok=True)
  for p in (repo/'logs').glob('*.BIN'):shutil.copy2(p,destination/p.name)
  metadata.update(error=error,binary_sha256=hashlib.sha256((repo/'build/sitl/bin/arduplane').read_bytes()).hexdigest(),
                  lqi_gains=os.environ.get('PG_LQI_GAINS'),oracle={k:os.environ.get(k,'0') for k in ['PG_ORACLE_KA','PG_ORACLE_KR','PG_ORACLE_KQ']},
                  airborne_preparation=True,normal_autotest=False)
  (root/(config['name']+'-metadata.json')).write_text(json.dumps(metadata,indent=2)+'\n')
  self.reset_SITL_commandline()
experiment.__name__='ParagliderAutoMission'
experiment.__doc__='Local actual Plane TECS with optional true-state throttle damping'
arduplane.AutoTestPlane.ParagliderAutoMission=experiment
sys.argv=[str(repo/'Tools/autotest/autotest.py'),'--speedup',str(config.get('speedup',10)),'test.Plane.ParagliderAutoMission']
runpy.run_path(sys.argv[0],run_name='__main__')
