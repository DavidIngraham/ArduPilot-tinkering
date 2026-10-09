import hashlib,importlib.util,json,os,runpy,shutil,sys
from pathlib import Path
root=Path(__file__).parent;repo=Path('/workspace/ardupilot');sys.path.insert(0,str(repo/'Tools/autotest'));import arduplane
spec=importlib.util.spec_from_file_location('fixture',root/'airborne-fixture.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
original=arduplane.AutoTestPlane.ParagliderAutoMission

def start(self,altitude=60,**kwargs):
 fixture.prepare(self,'joint',0)
 self.set_parameters({'TECS_HDEM_TCONST':2,'TECS_TIME_CONST':2,'TECS_VERT_ACC':2,'TECS_PTCH_DAMP':0})
 self.delay_sim_time(35,reason='settle integrated control before native AUTO mission')
arduplane.AutoTestPlane.paraglider_takeoff=start

def experiment(self):
 error=None
 try:original(self)
 except Exception as ex:error=repr(ex);raise
 finally:
  dest=root/'auto-mission-logs';dest.mkdir(exist_ok=True)
  for p in (repo/'logs').glob('*.BIN'):shutil.copy2(p,dest/p.name)
  p=Path(self.buildlogs_path('ParagliderAutoMission.csv'))
  if p.exists():shutil.copy2(p,root/'auto-mission.csv')
  if Path(str(p)+'.json').exists():shutil.copy2(Path(str(p)+'.json'),root/'auto-mission-route.json')
  (root/'auto-mission-metadata.json').write_text(json.dumps(dict(error=error,normal_route=True,normal_launch=False,
       airborne_preparation=True,controller='rate-soft',binary_sha256=hashlib.sha256((repo/'build/sitl/bin/arduplane').read_bytes()).hexdigest()),indent=2))
experiment.__name__='ParagliderAutoMission';experiment.__doc__='Native extended AUTO course with articulated model and integrated controller; local airborne preparation'
arduplane.AutoTestPlane.ParagliderAutoMission=experiment
sys.argv=[str(repo/'Tools/autotest/autotest.py'),'--speedup','10','test.Plane.ParagliderAutoMission']
runpy.run_path(sys.argv[0],run_name='__main__')
