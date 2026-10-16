use crate::{config::SimulationConfig, integrator, state::*, surface};
/// Stateful API. A successful step advances exactly dt seconds; failure is atomic.
pub struct Simulator {
    pub config: SimulationConfig,
    pub state: State,
    pub rpm: f64,
    pub time_s: f64,
    pub surface: Option<[f64; 3]>,
}
impl Simulator {
    pub fn new(config: SimulationConfig) -> crate::Result<Self> {
        config.validate()?;
        Ok(Self {
            state: State::from_column_slice(&config.initial_state),
            rpm: config.initial_rpm,
            config,
            time_s: 0.,
            surface: None,
        })
    }
    pub fn step(&mut self, command: [f64; 3], wind: [f64; 3], dt_s: f64) -> crate::Result<()> {
        if !(0. ..=1.).contains(&command[0]) {
            return Err("throttle must be 0..1".into());
        }
        let mut state = self.state;
        let mut rpm = self.rpm;
        let mut env = self.surface;
        let p = &self.config.parameters;
        let wind = V::from(wind);
        if let Some(ref mut surface_state) = env {
            surface::step(
                &mut state,
                &mut rpm,
                &command,
                p,
                self.config.mass_kg,
                wind,
                self.config.voltage_v,
                dt_s,
                surface_state,
                &surface::DEFAULT_SETTINGS,
            )?;
        } else {
            integrator::advance(
                &mut state,
                &mut rpm,
                &command,
                p,
                self.config.mass_kg,
                wind,
                self.config.voltage_v,
                dt_s,
                self.config.substeps,
                true,
            )?;
        }
        self.state = state;
        self.rpm = rpm;
        self.surface = env;
        self.time_s += dt_s;
        Ok(())
    }
    pub fn ground_start(&mut self) {
        let shift = self.state[2] + surface::DEFAULT_SETTINGS[0];
        self.state[2] -= shift;
        self.state[15] -= shift;
        self.state.fixed_rows_mut::<6>(7).fill(0.);
        self.state.fixed_rows_mut::<6>(20).fill(0.);
        self.rpm = 0.;
        self.surface = Some([0., 0., 0.]);
    }
    pub fn release(&mut self) {
        if let Some(ref mut env) = self.surface {
            if env[0] == 0. {
                env[0] = 1.;
            }
        }
    }
}
