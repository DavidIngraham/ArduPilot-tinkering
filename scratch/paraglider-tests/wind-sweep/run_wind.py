# Scratch-only orchestration; runs the existing mission with all its checks.
import json
from pathlib import Path
import runpy
import sys
repo = Path('/workspace/ardupilot')
sys.path.insert(0, str(repo/'Tools/autotest'))
import arduplane
config = json.loads(Path(sys.argv[1]).read_text())
original = arduplane.AutoTestPlane.ParagliderAutoMission

def mission(self):
    original_set = self.set_parameters
    def set_parameters(parameters, *args, **kwargs):
        parameters = dict(parameters)
        if 'SIM_WIND_SPD' in parameters and 'SIM_WIND_TURB' in parameters:
            parameters.update(config['wind_parameters'])
        return original_set(parameters, *args, **kwargs)
    self.set_parameters = set_parameters
    try:
        return original(self, artifact_suffix='-'+config['name'])
    finally:
        self.set_parameters = original_set
        meta = Path(self.buildlogs_path('ParagliderAutoMission-'+config['name']+'.csv.json'))
        if meta.exists():
            data = json.loads(meta.read_text())
            data['wind_parameters'] = config['wind_parameters']
            data['wind_applied_after_takeoff'] = True
            meta.write_text(json.dumps(data, indent=2)+'\n')
mission.__name__ = 'ParagliderAutoMission'
mission.__doc__ = 'Full paraglider AUTO mission with wind and turbulence'
arduplane.AutoTestPlane.ParagliderAutoMission = mission
sys.argv = [str(repo/'Tools/autotest/autotest.py'), '--speedup', '10', 'test.Plane.ParagliderAutoMission']
runpy.run_path(sys.argv[0], run_name='__main__')
