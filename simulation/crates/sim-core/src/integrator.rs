use crate::config::Parameters;
use crate::{dynamics::rhs, propulsion::*, state::*};
#[allow(clippy::too_many_arguments)]
pub fn advance(
    y: &mut State,
    rpm: &mut f64,
    u: &[f64; 3],
    p: &Parameters,
    mass: f64,
    wind: V,
    voltage: f64,
    dt: f64,
    substeps: usize,
    causal: bool,
) -> crate::Result<()> {
    if !dt.is_finite()
        || dt <= 0.
        || dt > 1.
        || substeps == 0
        || substeps > 10000
        || !u.iter().chain(wind.iter()).all(|v| v.is_finite())
        || !rpm.is_finite()
        || *rpm < 0.
        || !voltage.is_finite()
        || voltage <= 0.
    {
        return Err("invalid integration input".into());
    }
    validate(y)?;
    let h = dt / substeps as f64;
    for _ in 0..substeps {
        let target = target_rpm(u[0], voltage);
        let derivative = |z: &State, t: f64| {
            if !causal {
                return rhs(z, u, p, mass, wind, 0., 0., None);
            }
            let r = target + (*rpm - target) * (-t / MOTOR_TAU_S).exp();
            let axial = (rotation(z, 0).transpose() * (vector(z, 7) - wind)).x;
            rhs(
                z,
                &[thrust(r, axial) / p.thrust_max, u[1], u[2]],
                p,
                mass,
                wind,
                r,
                (target - r) / MOTOR_TAU_S,
                Some(torque(r, axial)),
            )
        };
        let k1 = derivative(y, 0.);
        let k2 = derivative(&(*y + 0.5 * h * k1), 0.5 * h);
        let k3 = derivative(&(*y + 0.5 * h * k2), 0.5 * h);
        let k4 = derivative(&(*y + h * k3), h);
        *y += h / 6. * (k1 + 2. * k2 + 2. * k3 + k4);
        normalize(y);
        if causal {
            *rpm = target + (*rpm - target) * (-h / MOTOR_TAU_S).exp();
        }
        validate(y)?;
    }
    Ok(())
}
