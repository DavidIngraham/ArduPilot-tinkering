# AP_FLAKE8_CLEAN
# Local-only model/parameter orchestration. All native mission checks remain active.
import importlib.util
import hashlib
import json
from pathlib import Path
import runpy
import shutil
import sys

repo = Path('/workspace/ardupilot')
root = Path(__file__).parent
config = json.loads(Path(sys.argv[1]).read_text())
sys.path.insert(0, str(repo / 'Tools/autotest'))
import arduplane
spec=importlib.util.spec_from_file_location('airborne',root/'airborne-fixture.py');fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
original = arduplane.AutoTestPlane.ParagliderAutoMission


def mission(self):
    old_takeoff = self.paraglider_takeoff
    old_set = self.set_parameters
    applied = {}
    def takeoff(*args, **kwargs):
        self.set_parameters = old_set
        try:
            result = fixture.prepare(self, config['model'], config['gain'])
            self.delay_sim_time(15, reason='settle in free flight before native AUTO mission')
        finally:
            self.set_parameters = set_parameters
        applied.update(self.get_parameters(['TECS_PTCH_DAMP', 'TECS_PG_PR_FILT', 'SIM_RATE_HZ']))
        return result
    def set_parameters(parameters, *args, **kwargs):
        parameters = dict(parameters)
        if 'SIM_WIND_SPD' in parameters and 'SIM_WIND_TURB' in parameters:
            if config.get('wind_ramp_s'):
                parameters.update(SIM_WIND_SPD=0, SIM_WIND_DIR=45, SIM_WIND_TURB=0)
                result = old_set(parameters, *args, **kwargs)
                for step in range(1, 11):
                    old_set({'SIM_WIND_SPD': config['wind'] * step / 10,
                             'SIM_WIND_TURB': config['turbulence'] * step / 10})
                    self.delay_sim_time(config['wind_ramp_s']/10, reason='gradually establish wind')
                self.delay_sim_time(10, reason='settle established wind before AUTO')
                return result
            parameters.update(SIM_WIND_SPD=config['wind'], SIM_WIND_DIR=45, SIM_WIND_TURB=config['turbulence'])
        return old_set(parameters, *args, **kwargs)
    self.paraglider_takeoff = takeoff
    self.set_parameters = set_parameters
    source = self.buildlogs_path('ParagliderAutoMission.csv')
    for path in (Path(source), Path(source + '.json')):
        if path.exists():
            path.unlink()
    error = None
    try:
        return original(self)
    except Exception as exc:
        error = repr(exc)
        raise
    finally:
        self.paraglider_takeoff = old_takeoff
        self.set_parameters = old_set
        for suffix in ('', '.json'):
            path = Path(source + suffix)
            if path.exists():
                shutil.copy2(path, root / (config['name'] + '.csv' + suffix))
        logdir = root / (config['name'] + '-logs')
        logdir.mkdir(exist_ok=True)
        for path in (repo / 'logs').glob('*.BIN'):
            shutil.copy2(path, logdir / path.name)
        metadata = dict(config=config, applied_parameters=applied, error=error,
                        airborne_initialization=True, binary_sha256=hashlib.sha256((repo / 'build/sitl/bin/arduplane').read_bytes()).hexdigest())
        (root / (config['name'] + '-run.json')).write_text(json.dumps(metadata, indent=2) + '\n')

mission.__name__ = 'ParagliderAutoMission'
mission.__doc__ = 'Native AUTO mission with model and longitudinal parameter overrides'
arduplane.AutoTestPlane.ParagliderAutoMission = mission
sys.argv = [str(repo / 'Tools/autotest/autotest.py'), '--speedup', '10', 'test.Plane.ParagliderAutoMission']
runpy.run_path(sys.argv[0], run_name='__main__')
