# Scratch orchestration: invokes the existing AUTO mission and its full checks.
import json
from pathlib import Path
import runpy
import sys
repo=Path('/workspace/ardupilot')
sys.path.insert(0,str(repo/'Tools/autotest'))
import arduplane
config=json.loads(Path(sys.argv[1]).read_text())
original=arduplane.AutoTestPlane.ParagliderAutoMission

def mission(self):
    return original(self,roll_gains=config['parameters'],artifact_suffix='-'+config['name'])
mission.__name__='ParagliderAutoMission'
mission.__doc__='Full paraglider AUTO mission with candidate turn settings'
arduplane.AutoTestPlane.ParagliderAutoMission=mission
sys.argv=[str(repo/'Tools/autotest/autotest.py'),'--speedup','10','test.Plane.ParagliderAutoMission']
runpy.run_path(sys.argv[0],run_name='__main__')
