from run import *
import closed

def audit():
 source=Path(json.loads((HERE/'source-provenance.json').read_text())['source'])
 original=ctypes.CDLL(str(source/'libdynamics.so'))
 original.causal_replay.argtypes=dynamics.lib.causal_replay.argtypes
 original.causal_replay.restype=ctypes.c_int
 checks=[]
 for flight in FLIGHTS:
  s,a=make(flight,'fixed');u=np.tile(a['command'],(101,1));u[20:60,2]+=5
  y,r=s.replay(a['state'],u,rpm=float(a['rpm']))
  out=np.zeros_like(y);rpm=np.zeros_like(r);cmd=np.ascontiguousarray([s.controls(*x) for x in u]);params=dynamics.params(s.parameters)[:60].copy()
  n=original.causal_replay(np.ascontiguousarray(a['state']),cmd,len(cmd),.04,32,params,s.geometry['mass'],np.zeros(3),22.2,float(a['rpm']),out,rpm)
  assert n==len(cmd)
  equivalence=float(np.max(abs(out-y)));assert equivalence<1e-12
  for variant in VARIANTS:
   ss,_=make(flight,variant);diag=dynamics.tension_diagnostic(ss,a['state'],a['rpm'],a['command'])
   n1,r1=ss.step(a['state'],float(a['rpm']),a['command'],dt=.00001)
   n0,r0=s.step(a['state'],float(a['rpm']),a['command'],dt=.00001)
   trimdelta=float(np.max(abs(n1-n0)));assert trimdelta<1e-9
   # Independent frozen-coefficient check at a disturbed state.
   z=y[50];load=dynamics.tension_diagnostic(ss,z,r[50],u[50]);frozen,_=make(flight,'fixed')
   fr,fy=VARIANTS[variant]
   frozen.parameters['joint_k_roll']*=1+fr*(load[2]-1)
   frozen.parameters['joint_k_yaw']*=1+fy*(load[2]-1)
   ld=dynamics.tension_diagnostic(frozen,z,r[50],u[50]);loaderr=float(abs(ld[0]-load[0]));assert loaderr<1e-10
   aa,_=ss.step(z,r[50],u[50],dt=1e-7);bb,_=frozen.step(z,r[50],u[50],dt=1e-7)
   acceleration_difference=float(max(abs(aa-bb))/1e-7);assert acceleration_difference<1e-4
   checks.append(dict(flight=flight,variant=variant,baseline_state_max=equivalence,trim_step_max=trimdelta,frozen_load_error=loaderr,frozen_derivative_error=acceleration_difference,reference_load=float(diag[0])))
 rows=json.loads((HERE/'flight-results.json').read_text())
 # Highest sampled load per flight, using primary initial condition.
 refined=[]
 for f in FLIGHTS:
  candidates=[x for x in rows if x['flight']==f and x['alpha']==.35 and x['variant']=='both']
  target=max(candidates,key=lambda x:x['load_quantiles'][-1])
  for variant in ['fixed','both']:
   refined.append(replay((f,target['start'],.35,variant,64)))
 cr=[]
 for c in closed.ex.scenarios():
  if c['name'] in ['strong_gust','limits_recovery']:
   for variant in ['fixed','both']:cr.append(closed.task((c,variant,32)))
 result=dict(checks=checks,flight_refinement=refined,controller_refinement=cr)
 (HERE/'audit-results.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2))
if __name__=='__main__':audit()
