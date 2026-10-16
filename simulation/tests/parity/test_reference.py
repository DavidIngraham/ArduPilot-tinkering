"""Compare Rust with immutable outputs captured from the retired C++ runtime."""
import json
from pathlib import Path

import numpy as np
from microagu_sim import Kernel

HERE = Path(__file__).resolve().parent
CONFIG = json.loads((HERE / 'cpp-reference.json').read_text())['config']


def test_cpp_reference():
    with np.load(HERE / 'cpp-reference.npz') as reference:
        kernel = Kernel(CONFIG['parameters'], CONFIG['mass'])
        for case in reference['derivatives']:
            actual = kernel.derivative(case[:26], case[26:29], case[29:32])
            np.testing.assert_allclose(actual, case[32:], rtol=1e-10, atol=1e-10)

        commands = np.tile([.4, .008, .012], (401, 1))
        commands[100:200] = [.6, .02, .005]
        wind = [1., -.5, .2]
        state = np.array(CONFIG['state'])
        actual = np.array(kernel.replay(
            state, commands.ravel(), wind, 22.2, CONFIG['rpm'], .005, 4, True
        )).reshape(-1, 27)
        np.testing.assert_allclose(actual, reference['airborne'], rtol=1e-8, atol=1e-8)

        settings = CONFIG['launch_settings']
        state[[2, 15]] -= state[2] + settings[0]
        state[7:13] = 0
        state[20:26] = 0
        rpm, env, phases = 0., [1., 0., 0.], set()
        for i, expected in enumerate(reference['surface']):
            command = [.65 if i < 1600 else 0., 0., 0.]
            result = np.array(kernel.surface_step(
                state, command, wind, 22.2, rpm, .005, env, settings
            ))
            state, rpm, env = result[:26], result[26], result[27:]
            np.testing.assert_allclose(result[:27], expected[:27], rtol=2e-7, atol=2e-7)
            np.testing.assert_allclose(env, expected[27:], rtol=1e-10, atol=1e-10)
            phases.add(int(env[0]))
        assert phases == {1, 2, 3}
