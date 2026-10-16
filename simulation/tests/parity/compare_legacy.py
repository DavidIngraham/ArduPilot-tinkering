"""Numerical migration gate against independently compiled, frozen C++ kernel."""
from pathlib import Path
import ctypes
import json
import numpy as np
from microagu_sim import Kernel

root = Path(__file__).resolve().parents[2]
config = json.loads((root.parent / 'viewer/public/wasm/highdof.json').read_text())
library = root / 'legacy/libdynamics.so'
if not library.exists():
    library = root / 'libdynamics.so'
lib = ctypes.CDLL(str(library))
ptr = np.ctypeslib.ndpointer(dtype=np.float64, flags='C_CONTIGUOUS')
lib.derivative.argtypes = [ptr, ptr, ptr, ctypes.c_double, ptr, ptr]
lib.causal_replay.argtypes = [ptr,ptr,ctypes.c_int,ctypes.c_double,ctypes.c_int,ptr,ctypes.c_double,ptr,ctypes.c_double,ctypes.c_double,ptr,ptr]
lib.causal_replay.restype = ctypes.c_int
lib.surface_step.argtypes = [ptr,ptr,ptr,ctypes.c_double,ptr,ctypes.c_double,ctypes.c_double,ctypes.c_double,ptr,ptr,ptr,ptr]
lib.surface_step.restype = ctypes.c_int
p = np.array(config['parameters'])
state = np.array(config['state'])
kernel = Kernel(p, config['mass'])
rng = np.random.default_rng(20261015)
maximum = 0.
for _ in range(100):
    y = state + rng.normal(0, .01, 26)
    u = rng.uniform([.1,0,0],[.8,.05,.06])
    wind = rng.normal(0, .7, 3)
    expected = np.zeros(26)
    lib.derivative(y,u,p,config['mass'],wind,expected)
    actual = np.array(kernel.derivative(y,u,wind))
    np.testing.assert_allclose(actual,expected,rtol=1e-10,atol=1e-10)
    maximum=max(maximum,float(np.max(abs(actual-expected))))
print('100 randomized derivative cases, maximum error', maximum)
commands = np.tile([.4,.008,.012], (401,1))
commands[100:200] = [.6,.02,.005]
wind = np.array([1.,-.5,.2])
expected = np.zeros((401,26)); rpm = np.zeros(401)
assert lib.causal_replay(state,commands,401,.005,4,p,config['mass'],wind,22.2,config['rpm'],expected,rpm)==401
actual=np.array(kernel.replay(state,commands.ravel(),wind,22.2,config['rpm'],.005,4,True)).reshape(-1,27)
np.testing.assert_allclose(actual[:,:26],expected,atol=1e-8,rtol=1e-8)
np.testing.assert_allclose(actual[:,26],rpm,atol=1e-8,rtol=1e-8)
print('400 airborne intervals, maximum error',np.max(abs(actual[:,:26]-expected)))
settings=np.array(config['launch_settings']); env=np.array([1.,0.,0.]); rust_env=env.copy()
state[[2,15]]-=state[2]+settings[0]; state[7:13]=0;state[20:26]=0
rust_state=state.copy();rpm=0.;rust_rpm=0.;maximum=0.;phases=set()
for i in range(5000):
    u=np.array([.65 if i<1600 else 0.,0.,0.]);out=np.zeros(26);r=np.zeros(1)
    assert lib.surface_step(state,u,p,config['mass'],wind,22.2,rpm,.005,settings,env,out,r)==1
    result=np.array(kernel.surface_step(rust_state,u,wind,22.2,rust_rpm,.005,rust_env,settings))
    state=out;rpm=r[0];rust_state=result[:26];rust_rpm=result[26];rust_env=result[27:]
    np.testing.assert_allclose(rust_state,state,atol=2e-7,rtol=2e-7)
    np.testing.assert_allclose(rust_env,env,atol=1e-10,rtol=1e-10)
    maximum=max(maximum,float(np.max(abs(rust_state-state))));phases.add(int(env[0]))
assert phases=={1,2,3},phases
print('5000 launch/flight/contact intervals, maximum error',maximum)
