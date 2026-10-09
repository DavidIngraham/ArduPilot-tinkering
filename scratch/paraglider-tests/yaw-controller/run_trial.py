# Local-only tuning runner: retains every assertion in the normal AUTO mission.
import json,runpy,shutil,sys
from pathlib import Path
repo=Path('/workspace/ardupilot');root=Path(__file__).parent
sys.path.insert(0,str(repo/'Tools/autotest'))
import arduplane
config=json.loads(Path(sys.argv[1]).read_text())
original=arduplane.AutoTestPlane.ParagliderAutoMission

def mission(self):
    csv=Path(self.buildlogs_path('ParagliderAutoMission.csv'))
    for f in [csv,Path(str(csv)+'.json')]:
        if f.exists():f.unlink()
    original_set=self.set_parameters
    original_takeoff=self.paraglider_takeoff
    applied={}
    def takeoff(*args,**kwargs):
        result=original_takeoff(*args,**kwargs)
        self.set_parameters(config['controller_parameters'])
        applied.update(self.get_parameters(['PG_TURN_'+x for x in ('ENABLE','FF','P','I','IMAX','RMAX','ACCEL','FILT','TC','ASPD','RDAMP','D_FF')]))
        return result
    def set_parameters(parameters,*args,**kwargs):
        parameters=dict(parameters)
        if 'SIM_WIND_SPD' in parameters and 'SIM_WIND_TURB' in parameters:
            parameters.update(config.get('wind_parameters',{'SIM_WIND_SPD':0,'SIM_WIND_TURB':0,'SIM_WIND_DIR':45}))
        return original_set(parameters,*args,**kwargs)
    self.set_parameters=set_parameters
    self.paraglider_takeoff=takeoff
    try:
        return original(self)
    finally:
        self.set_parameters=original_set;self.paraglider_takeoff=original_takeoff
        meta=Path(str(csv)+'.json')
        if meta.exists():
            data=json.loads(meta.read_text());data.update(controller_parameters=applied,wind_parameters=config.get('wind_parameters',{}))
            meta.write_text(json.dumps(data,indent=2)+'\n')
            shutil.copy2(meta,root/('ParagliderAutoMission-'+config['name']+'.csv.json'))
            shutil.copy2(csv,root/('ParagliderAutoMission-'+config['name']+'.csv'))
        dest=root/(config['name']+'-dataflash');dest.mkdir(exist_ok=True)
        for f in (repo/'logs').glob('*.BIN'):shutil.copy2(f,dest/f.name)
mission.__name__='ParagliderAutoMission';mission.__doc__='Matched normal paraglider AUTO mission with controller overrides'
arduplane.AutoTestPlane.ParagliderAutoMission=mission
sys.argv=[str(repo/'Tools/autotest/autotest.py'),'--speedup','10','test.Plane.ParagliderAutoMission']
runpy.run_path(sys.argv[0],run_name='__main__')
