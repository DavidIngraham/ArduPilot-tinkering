"""Run with an installed wheel from any working directory, without repo imports."""
from microagu_sim import Simulator, config_schema, Kernel
from microagu_sim.compat.profiles import make_simulator

assert config_schema()
model = make_simulator(profile='as_built')
assert model.parameters['riser_halfspacing'] == 0.066
print('Isolated wheel, extension and packaged calibration/trim resources OK')
