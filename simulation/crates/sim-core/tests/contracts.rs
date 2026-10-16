use sim_core::{state::State, Parameters, SimulationConfig, Simulator};
fn config() -> SimulationConfig {
    let mut state = [0.; 26];
    state[6] = 1.;
    state[19] = 1.;
    state[2] = -100.;
    state[15] = -100.98;
    state[7] = 4.;
    state[20] = 4.;
    SimulationConfig {
        schema_version: 1,
        parameters: Parameters::default(),
        mass_kg: 1.,
        initial_state: state,
        voltage_v: 22.2,
        initial_rpm: 0.,
        substeps: 4,
    }
}
#[test]
fn invalid_configuration_is_rejected() {
    let mut c = config();
    c.parameters.ixx = -1.;
    assert!(Simulator::new(c).is_err());
    let mut c = config();
    c.initial_state[6] = 0.;
    assert!(Simulator::new(c).is_err());
    let mut c = config();
    c.mass_kg = c.parameters.canopy_mass;
    assert!(Simulator::new(c).is_err());
}
#[test]
fn failed_step_is_atomic() {
    let mut sim = Simulator::new(config()).unwrap();
    let before = sim.state;
    assert!(sim.step([0.4, 0., 0.], [0.; 3], f64::NAN).is_err());
    assert_eq!(sim.state, before);
    assert_eq!(sim.time_s, 0.);
    assert_eq!(sim.rpm, 0.);
}
#[test]
fn step_advances_exact_interval_and_normalizes_quaternions() {
    let mut sim = Simulator::new(config()).unwrap();
    sim.step([0.4, 0., 0.], [0.; 3], 0.01).unwrap();
    assert_eq!(sim.time_s, 0.01);
    for offset in [3, 16] {
        assert!((sim.state.fixed_rows::<4>(offset).norm() - 1.).abs() < 1e-14);
    }
}
#[test]
fn actuator_average_includes_travel_and_hold() {
    let mut position = [0., 0.];
    let average = sim_core::actuators::advance(&mut position, [1., 4.], 1., 2.).unwrap();
    assert_eq!(position, [1., 2.]);
    assert_eq!(average, [0.75, 1.]);
}
#[test]
fn array_boundary_rejects_wrong_lengths() {
    assert!(sim_core::kernel::Kernel::new(&[0.; 69], 1.).is_err());
    let c = config();
    let kernel = sim_core::kernel::Kernel::new(&c.parameters.packed(), 1.).unwrap();
    assert!(kernel.derivative(&[0.; 25], &[0.; 3], &[0.; 3]).is_err());
    assert!(sim_core::state::validate(&State::zeros()).is_err());
}
