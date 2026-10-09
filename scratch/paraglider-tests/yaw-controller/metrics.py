import csv,importlib.util,json,math,re,statistics,sys
from pathlib import Path
root=Path(__file__).parent
spec=importlib.util.spec_from_file_location('analysis',root.parent/'turn-optimization/analyze.py');a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
results=[]
for config in json.loads(Path(sys.argv[1]).read_text()):
 name=config['name'];p=root/('ParagliderAutoMission-'+name+'.csv')
 if not p.exists():continue
 try:m=a.analyze(p)
 except (ValueError,IndexError,ZeroDivisionError):m={}
 rows=list(csv.DictReader(p.open()));circle=[r for r in rows if r['seq']=='3'][-600:]
 if len(circle)>10:
  m['loiter_yaw_std_dps']=statistics.stdev([math.degrees(float(r['yaw_rate_radps'])) for r in circle]);m['loiter_brake_std_fraction']=statistics.stdev([(float(r['right_brake_pwm'])-float(r['left_brake_pwm']))/800 for r in circle])
 meta=json.loads(Path(str(p)+'.json').read_text());m.update(name=name,result=config['result'],controller_parameters=meta['controller_parameters'],wind_parameters=meta['wind_parameters'])
 log=(root/(name+'.log')).read_text();m['failure']=re.findall(r'Exception caught: ([^\n]+)',log)
 (root/(name+'.metrics.json')).write_text(json.dumps(m,indent=2)+'\n');results.append(m)
print(json.dumps([{k:m.get(k) for k in ['name','result','max_corner_overrun_m','straight_rms_m','max_bank_deg','loiter_yaw_std_dps','loiter_brake_std_fraction','longest_brake_saturation_s','failure']} for m in results],indent=2))
