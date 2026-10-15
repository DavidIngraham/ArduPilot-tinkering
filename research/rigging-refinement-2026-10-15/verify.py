# AP_FLAKE8_CLEAN
"""Geometry invariants, exact disabled-mode parity and integration convergence."""
import sys,ctypes,json,subprocess
import numpy as np
from scipy.spatial.transform import Rotation as R
from study import HERE,make,replay
import dynamics,routing
old=HERE/'model'/'legacy.cpp'
subprocess.run(['g++','-O3','-std=c++17','-shared','-fPIC','-I/usr/include/eigen3',str(old),'-o',str(old.with_suffix('.so'))],check=True)
lib=ctypes.CDLL(str(old.with_suffix('.so')));lib.derivative.argtypes=dynamics.lib.derivative.argtypes
s,trim=make('trout_lake');y=trim['state'];u=s.controls(*trim['command']);p=dynamics.params(s.parameters);out=np.zeros(26)
lib.derivative(y,u,p,s.geometry['mass'],np.zeros(3),out)
assert np.array_equal(out,dynamics.derivative(y,u,s.parameters,s.geometry['mass'],np.zeros(3)))
routing.configure(s,y)
assert np.max(abs(routing.diagnostic(s,y,trim['command'])['delta_m']))<1e-14
# A common world rotation leaves relative geometry unchanged.
z=y.copy();q=R.from_euler('xyz',[.5,-.2,1.])
for k in [3,16]:z[k:k+4]=(q*R.from_quat(y[k:k+4])).as_quat()
assert np.max(abs(dynamics.brake_paths(z,s.parameters)-dynamics.brake_paths(y,s.parameters)))<1e-14
# Mirror-symmetric attitudes produce equal left/right paths.
z=s.initial_state();assert abs(np.diff(dynamics.brake_paths(z,s.parameters))[0])<1e-14
# Zero ring height removes pitch-only relative motion along the riser-bolt axis.
s.parameters['ring_height']=0.;base=dynamics.brake_paths(z,s.parameters)
z[3:7]=R.from_euler('y',.4).as_quat()
assert np.max(abs(dynamics.brake_paths(z,s.parameters)-base))<1e-14
# A manually increased path consumes slack before brake engagement.
s.parameters['routing_enabled']=1.;s.parameters['left_offset']=.012
assert s.controls(.3,0,0)[1]==-.012
routing.configure(s,z)
s.parameters['route_reference_left']-=.020
assert abs(routing.diagnostic(s,z,[.3,0,0])['effective_m'][0]-.008)<1e-12
rows=[replay(('trout_lake',840,'routed',(1.,1.,1.),30,.35,.06,n)) for n in [32,64]]
relative={k:abs(rows[0]['metrics'][k]-rows[1]['metrics'][k])/max(rows[1]['metrics'][k],1e-8) for k in rows[0]['metrics']}
assert max(relative.values())<.001
result=dict(disabled_derivative_bitwise_equal=True,geometry_invariants=True,slack_before_clip=True,integration_relative_metric_difference=relative)
(HERE/'verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
