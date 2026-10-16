"""Run from simulation/: uv run python examples/replay.py"""
from pathlib import Path
from microagu_sim import Simulator

config = Path(__file__).parents[1] / 'data/presets/as-built-trout-lake.json'
sim = Simulator(config.read_text())
for _ in range(100):
    sim.step([0.4, 0.0, 0.0], [0.0, 0.0, 0.0], 0.005)
print(f'{sim.time_s:.3f} s, {sim.rpm:.1f} RPM, position NED {sim.state[:3]}')
