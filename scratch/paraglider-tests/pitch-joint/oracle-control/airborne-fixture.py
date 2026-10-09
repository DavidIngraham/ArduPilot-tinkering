# Local-only kinematic preparation; release then uses unchanged production free-flight dynamics.
from pathlib import Path
repo=Path('/workspace/ardupilot');root=Path(__file__).parent

def prepare(self,model,gain=0):
 self.customise_SITL_commandline([],model='paraglider-airborne:../scratch/paraglider-tests/pitch-joint/oracle-control/'+model+'.json',defaults_filepath=self.model_defaults_filepath('paraglider'),wipe=True)
 self.set_rc_default()
 self.set_parameters({'TECS_PTCH_DAMP':gain,'SIM_WIND_SPD':0,'SIM_WIND_TURB':0,'SERVO7_FUNCTION':0})
 self.set_rc_from_map({1:1500,2:1500,3:1500,4:1500})
 self.change_mode('FBWB');self.wait_ready_to_arm();self.arm_vehicle(force=True)
 self.set_home(self.sitl_start_location())
 self.change_mode('MANUAL');self.change_mode('FBWB')
 self.delay_sim_time(3,reason='initialize TECS before releasing airborne trim preparation')
 self.set_servo(7,2000)
 self.delay_sim_time(1,reason='release kinematic initialization into production free-flight dynamics')
