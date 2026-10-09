# AP_FLAKE8_CLEAN
# Local-only physics/closed-loop experiment. Actual Plane TECS runs in SITL.
import csv
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


def experiment(self):
    original = self.customise_SITL_commandline
    original_set = self.set_parameters
    def customise(*args, **kwargs):
        if config.get('rate') and kwargs.get('model') == 'paraglider-throw':
            args = (list(args[0]) + ['--rate', str(config['rate'])],) + args[1:]
        if kwargs.get('model') == 'paraglider-throw' and config['joint']:
            kwargs['model'] = 'paraglider-throw:' + '../scratch/paraglider-tests/pitch-joint/' + config.get('model', 'joint.json')
        return original(*args, **kwargs)
    def set_parameters(parameters, *args, **kwargs):
        parameters = dict(parameters)
        if 'TKOFF_ALT' in parameters:
            parameters['TECS_PTCH_DAMP'] = 0
            parameters['SIM_WIND_SPD'] = 0
            parameters['SIM_WIND_TURB'] = 0
        return original_set(parameters, *args, **kwargs)
    self.customise_SITL_commandline = customise
    self.set_parameters = set_parameters
    records = []
    latest = {}
    def observe(mav, message):
        kind = message.get_type()
        if kind in ('ATTITUDE', 'GLOBAL_POSITION_INT', 'SERVO_OUTPUT_RAW', 'SIMSTATE'):
            latest[kind] = message.to_dict()
        if kind == 'ATTITUDE':
            records.append(dict(t=message.time_boot_ms/1000, pitch=message.pitch,
                                q=message.pitchspeed, roll=message.roll,
                                altitude=latest.get('GLOBAL_POSITION_INT', {}).get('relative_alt', 0)/1000,
                                pwm=latest.get('SERVO_OUTPUT_RAW', {}).get('servo3_raw', 0)))
    self.install_message_hook(observe)
    try:
        self.paraglider_takeoff(120)
        self.change_mode('FBWB')
        self.set_rc_from_map({1:1500, 2:1500, 3:1500, 4:1500})
        self.set_message_rate_hz('ATTITUDE', 25)
        self.set_message_rate_hz('SERVO_OUTPUT_RAW', 25)
        self.delay_sim_time(30, reason='settle with zero pitch damper')
        if config.get('physics_rate'):
            self.set_parameter('SIM_RATE_HZ', config['physics_rate'])
            self.delay_sim_time(3, reason='settle the changed physics timestep')
        start = self.get_sim_time()
        self.set_parameter('TECS_PTCH_DAMP', config['gain'])
        # A short pilot climb command seeds the mode, then sticks return to trim.
        self.set_rc(2, 1400)
        self.delay_sim_time(2, reason='matched longitudinal perturbation')
        self.set_rc(2, 1500)
        self.delay_sim_time(100, reason='observe closed-loop pitch response')
        (root / (config['name'] + '-metadata.json')).write_text(json.dumps(dict(config=config, start=start), indent=2))
    finally:
        self.remove_message_hook(observe)
        self.customise_SITL_commandline = original
        self.set_parameters = original_set
        if records:
            with (root / (config['name'] + '.csv')).open('w') as f:
                writer=csv.DictWriter(f, fieldnames=records[0].keys());writer.writeheader();writer.writerows(records)
        dest = root / (config['name'] + '-logs');dest.mkdir(exist_ok=True)
        for f in (repo / 'logs').glob('*.BIN'):
            shutil.copy2(f, dest / f.name)
    self.disarm_vehicle(force=True)

experiment.__name__ = 'ParagliderAutoMission'
experiment.__doc__ = 'Local pitch-joint damper experiment'
arduplane.AutoTestPlane.ParagliderAutoMission = experiment
sys.argv = [str(repo / 'Tools/autotest/autotest.py'), '--speedup', '10', 'test.Plane.ParagliderAutoMission']
runpy.run_path(sys.argv[0], run_name='__main__')
