//! Checked array boundary shared by language adapters and legacy research callers.
use crate::{config::Parameters, dynamics, integrator, state::*, surface};
pub struct Kernel {
    parameters: Parameters,
    mass: f64,
}
pub fn array<const N: usize>(values: &[f64]) -> crate::Result<[f64; N]> {
    let result: [f64; N] = values
        .try_into()
        .map_err(|_| format!("expected {N} values"))?;
    if !values.iter().all(|x| x.is_finite()) {
        return Err("nonfinite input".into());
    }
    Ok(result)
}
impl Kernel {
    pub fn inverted_launch(
        &self,
        trim: &[f64],
        time_s: f64,
        hand_height_m: f64,
    ) -> crate::Result<Vec<f64>> {
        crate::launch::sample(
            &State::from(array::<26>(trim)?),
            &self.parameters,
            time_s,
            hand_height_m,
        )
    }
    pub fn new(parameters: &[f64], mass: f64) -> crate::Result<Self> {
        let parameters = Parameters::from_packed(parameters)?;
        parameters.validate(mass)?;
        Ok(Self { parameters, mass })
    }
    pub fn derivative(
        &self,
        state: &[f64],
        command: &[f64],
        wind: &[f64],
    ) -> crate::Result<Vec<f64>> {
        let y = State::from(array::<26>(state)?);
        validate(&y)?;
        let out = dynamics::rhs(
            &y,
            &array(command)?,
            &self.parameters,
            self.mass,
            V::from(array(wind)?),
            0.,
            0.,
            None,
        );
        if !out.iter().all(|x| x.is_finite()) {
            return Err("nonfinite derivative".into());
        }
        Ok(out.as_slice().to_vec())
    }
    /// Rows are initial state then interval endpoints; last control is unused (legacy convention).
    #[allow(clippy::too_many_arguments)]
    pub fn replay(
        &self,
        state: &[f64],
        commands: &[f64],
        wind: &[f64],
        voltage: f64,
        rpm: f64,
        dt: f64,
        substeps: usize,
        causal: bool,
    ) -> crate::Result<Vec<f64>> {
        if !dt.is_finite()
            || dt <= 0.
            || dt > 1.
            || substeps == 0
            || substeps > 10000
            || !voltage.is_finite()
            || voltage <= 0.
            || !rpm.is_finite()
            || rpm < 0.
        {
            return Err("invalid replay timing or rotor input".into());
        }
        if commands.is_empty()
            || !commands.len().is_multiple_of(3)
            || !commands.iter().all(|x| x.is_finite())
        {
            return Err("commands must be a nonempty Nx3 array".into());
        }
        let mut y = State::from(array::<26>(state)?);
        validate(&y)?;
        let mut rpm = rpm;
        let w = V::from(array(wind)?);
        let mut output = Vec::with_capacity(commands.len() / 3 * 27);
        for (i, u) in commands.as_chunks::<3>().0.iter().enumerate() {
            output.extend_from_slice(y.as_slice());
            output.push(rpm);
            if i + 1 < commands.len() / 3 {
                integrator::advance(
                    &mut y,
                    &mut rpm,
                    &array(u)?,
                    &self.parameters,
                    self.mass,
                    w,
                    voltage,
                    dt,
                    substeps,
                    causal,
                )?;
            }
        }
        Ok(output)
    }
    /// Returns [26 state values, RPM, phase, elapsed launch time, inflation].
    #[allow(clippy::too_many_arguments)]
    pub fn surface_step(
        &self,
        state: &[f64],
        command: &[f64],
        wind: &[f64],
        voltage: f64,
        rpm: f64,
        dt: f64,
        env: &[f64],
        settings: &[f64],
    ) -> crate::Result<Vec<f64>> {
        let mut y = State::from(array::<26>(state)?);
        let mut rpm = rpm;
        let mut env = array(env)?;
        surface::step(
            &mut y,
            &mut rpm,
            &array(command)?,
            &self.parameters,
            self.mass,
            V::from(array(wind)?),
            voltage,
            dt,
            &mut env,
            &array(settings)?,
        )?;
        let mut output = y.as_slice().to_vec();
        output.push(rpm);
        output.extend(env);
        Ok(output)
    }
    pub fn brake_paths(&self, state: &[f64]) -> crate::Result<Vec<f64>> {
        let y = State::from(array::<26>(state)?);
        validate(&y)?;
        Ok([-1., 1.]
            .iter()
            .map(|s| dynamics::brake_path(rotation(&y, 0), rotation(&y, 13), &self.parameters, *s))
            .collect())
    }
}
