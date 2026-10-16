import json
from pathlib import Path
import pytest
from microagu_sim import Simulator, config_schema, parameter_keys

def config():
    return json.loads((Path(__file__).parents[1] / 'data/presets/as-built-trout-lake.json').read_text())

def test_installed_api_and_rust_validation():
    c = config()
    sim = Simulator(json.dumps(c))
    before = sim.state
    with pytest.raises(ValueError):
        sim.step([0.4, 0, 0], [0, 0, 0], -0.1)
    assert sim.state == before
    assert sim.time_s == 0
    assert len(sim.step([0.4, 0, 0], [0, 0, 0], 0.005)) == 26
    assert sim.time_s == 0.005
    c['unknown'] = True
    with pytest.raises(ValueError):
        Simulator(json.dumps(c))

def test_schema_matches_packed_compatibility_contract():
    schema = json.loads(config_schema())
    assert set(schema['definitions']['Parameters']['properties']) == set(parameter_keys())
    assert schema['additionalProperties'] is False

def test_packaged_scientific_resources():
    from microagu_sim.compat.profiles import make_simulator
    sim = make_simulator('trout_lake', 'as_built')
    assert sim.parameters['riser_halfspacing'] == 0.066

def test_numpy_batch_contract():
    import numpy as np
    from microagu_sim import Kernel
    c = config()
    kernel = Kernel([c['parameters'][k] for k in parameter_keys()], c['mass_kg'])
    state = np.asarray(c['initial_state'])
    controls = np.tile([0.4, 0., 0.], 3)
    result = kernel.replay_numpy(state, controls, np.zeros(3), 22.2, c['initial_rpm'], .005, 4, True)
    assert result.shape == (3, 27)
    assert result.dtype == np.float64
    np.testing.assert_array_equal(result[0, :26], state)
    with pytest.raises(ValueError):
        kernel.replay(state, [0.4, 0., 0.], [0., 0., 0.], 22.2, float('nan'), .005, 4, True)
