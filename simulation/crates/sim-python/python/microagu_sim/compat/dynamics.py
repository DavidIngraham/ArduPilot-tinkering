"""Compatibility API backed exclusively by the installed Rust extension."""
import json
import numpy as np
from microagu_sim import _native
DEFAULT = json.loads(_native.parameter_defaults_json())
KEYS = _native.parameter_keys()
def params(p=None):
 d=DEFAULT.copy();d.update(p or {});scale=d.get('added_scale',1.)
 if d['geometry_yaw']>0:
  a,b,h=d['yaw_payload_halfspacing'],d['yaw_canopy_halfspacing'],d['yaw_vertical_separation']
  if min(a,b,h)<=0 or h*h<=4*a*b:raise ValueError('Yaw geometry requires positive spacings and h^2 > 4ab')
 for k in KEYS[30:36]:d[k]*=scale
 return np.array([d[k] for k in KEYS])
from microagu_sim import _native
# Compatibility alias for old analysis scripts; this is a Rust module, not ctypes.
lib = _native
LAUNCH_SETTINGS = np.array([.10,1.20,4.5,3.,.8,.5])
def _kernel(p,m):
 return _native.Kernel(params(p),m)
def derivative(y,u,p,m,w):
 return np.asarray(_kernel(p,m).derivative(y,u,w))
def replay(y,U,p,m,w,dt=.04,substeps=4):
 U=np.asarray(U,dtype=float)
 if U.ndim!=2 or U.shape[1]!=3: raise ValueError('commands must be Nx3')
 return _kernel(p,m).replay_numpy(np.ascontiguousarray(y,dtype=float),np.ascontiguousarray(U.ravel()),np.ascontiguousarray(w,dtype=float),22.2,0.,dt,substeps,False)[:,:26]
def causal_replay(y,U,p,m,w,voltage,rpm,dt=.04,substeps=4):
 U=np.asarray(U,dtype=float)
 if U.ndim!=2 or U.shape[1]!=3: raise ValueError('commands must be Nx3')
 result=_kernel(p,m).replay_numpy(np.ascontiguousarray(y,dtype=float),np.ascontiguousarray(U.ravel()),np.ascontiguousarray(w,dtype=float),voltage,rpm,dt,substeps,True)
 return result[:,:26],result[:,26]
def rotor_loads(omega_world,rotation,inertia,signed_rpm,signed_rpm_rate=0.):
 return np.asarray(_native.rotor_loads(omega_world,np.asarray(rotation).flatten(order='F'),inertia,signed_rpm,signed_rpm_rate))
def brake_paths(y,p):
 return np.asarray(_kernel(p,max(1.,p.get('canopy_mass',.19)+1.)).brake_paths(y))
def surface_step(y,u,p,m,w,voltage,rpm,dt,env,settings=LAUNCH_SETTINGS):
 result=np.asarray(_kernel(p,m).surface_step(y,u,w,voltage,rpm,dt,env,settings))
 env[:]=result[27:]
 return result[:26],float(result[26])
