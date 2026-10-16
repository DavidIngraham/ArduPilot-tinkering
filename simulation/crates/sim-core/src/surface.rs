//! Reduced assisted overhead launch, scalar inflation, and constrained plastic contact.
use crate::config::Parameters;
use crate::{
    dynamics::{canopy_inertia, payload_inertia},
    integrator::advance,
    propulsion::*,
    state::*,
};
pub const DEFAULT_SETTINGS: [f64; 6] = [0.10, 1.20, 4.5, 3., 0.8, 0.5];
fn contact(
    y: &mut State,
    p: &Parameters,
    mass: f64,
    friction: f64,
    radius: f64,
) -> crate::Result<bool> {
    let rp = rotation(y, 0);
    let rc = rotation(y, 13);
    let mut hp = M6::zeros();
    hp.fixed_view_mut::<3, 3>(0, 0)
        .copy_from(&(M::identity() / (mass - p.canopy_mass)));
    hp.fixed_view_mut::<3, 3>(3, 3).copy_from(
        &(rp * payload_inertia(p) * rp.transpose())
            .try_inverse()
            .ok_or("singular payload inertia")?,
    );
    let r = spatial_rotation(rc);
    let hc = r
        * canopy_inertia(p)
            .try_inverse()
            .ok_or("singular canopy inertia")?
        * r.transpose();
    let gp = constraint(rp * V::new(p.hinge_x, p.hinge_y, p.hinge_z));
    let gc = constraint(rc * V::new(0., 0., 0.85));
    let a = gp * hp * gp.transpose() + gc * hc * gc.transpose();
    let solve = a.cholesky().ok_or("singular contact constraint")?;
    let mut touched = false;
    for body in 0..2 {
        let k = 13 * body;
        let radius = if body == 1 { 0.03 } else { radius };
        let penetration = y[k + 2] + radius;
        if penetration < 0. {
            continue;
        }
        touched = true;
        y[2] -= penetration;
        y[15] -= penetration;
        let c = constraint(V::new(0., 0., radius));
        let mut dp = if body == 0 {
            hp * c.transpose()
        } else {
            nalgebra::SMatrix::<f64, 6, 3>::zeros()
        };
        let mut dc = if body == 1 {
            hc * c.transpose()
        } else {
            nalgebra::SMatrix::<f64, 6, 3>::zeros()
        };
        let reaction = solve.solve(&-(gp * dp - gc * dc));
        dp += hp * gp.transpose() * reaction;
        dc -= hc * gc.transpose() * reaction;
        let stiffness = c * if body == 1 { dc } else { dp };
        let velocity = c * y.fixed_rows::<6>(k + 7);
        if velocity.z <= 0. {
            continue;
        }
        let mut impulse = stiffness
            .cholesky()
            .ok_or("singular ground response")?
            .solve(&-velocity);
        if impulse.z > 0. || impulse.fixed_rows::<2>(0).norm() > friction * (-impulse.z) {
            let tangent = V::new(velocity.x, velocity.y, 0.);
            let mut direction = V::new(0., 0., -1.);
            if tangent.norm() > 1e-9 {
                direction -= friction * tangent.normalize();
            }
            let denominator = (stiffness * direction).z;
            impulse = if denominator < -1e-12 {
                direction * (-velocity.z / denominator)
            } else {
                V::zeros()
            };
            let work = impulse.dot(&velocity);
            let quadratic = impulse.dot(&(stiffness * impulse));
            if quadratic > 0. && work + 0.5 * quadratic > 0. {
                impulse *= (-2. * work / quadratic).clamp(0., 1.);
            }
        }
        let pp = y.fixed_rows::<6>(7).into_owned() + dp * impulse;
        let cc = y.fixed_rows::<6>(20).into_owned() + dc * impulse;
        y.fixed_rows_mut::<6>(7).copy_from(&pp);
        y.fixed_rows_mut::<6>(20).copy_from(&cc);
    }
    Ok(touched)
}
#[allow(clippy::too_many_arguments)]
pub fn step(
    y: &mut State,
    rpm: &mut f64,
    u: &[f64; 3],
    p: &Parameters,
    mass: f64,
    wind: V,
    voltage: f64,
    dt: f64,
    env: &mut [f64; 3],
    settings: &[f64; 6],
) -> crate::Result<()> {
    if !dt.is_finite()
        || dt <= 0.
        || dt > 1.
        || !settings
            .iter()
            .chain(env.iter())
            .chain(u.iter())
            .chain(wind.iter())
            .all(|x| x.is_finite())
        || settings[0] <= 0.
        || settings[1] < settings[0]
        || settings[2] < 0.
        || settings[3] <= 0.
        || settings[4] <= 0.
        || settings[5] < 0.
        || ![0., 1., 2., 3.].contains(&env[0])
        || env[1] < 0.
        || !(0. ..=1.).contains(&env[2])
        || !voltage.is_finite()
        || voltage <= 0.
    {
        return Err("invalid launch settings or input".into());
    }
    validate(y)?;
    let steps = (dt / 0.00125).ceil() as usize;
    let h = dt / steps as f64;
    for _ in 0..steps {
        if env[0] < 2. {
            if env[0] == 1. {
                env[1] += h;
            }
            let t = env[1];
            let duration = settings[3];
            let progress = (t / duration).clamp(0., 1.);
            let v = settings[2] * progress;
            let vz = if t < duration && env[0] == 1. {
                -(settings[1] - settings[0]) / duration
            } else {
                0.
            };
            y[0] += v * h;
            y[2] = -settings[0] - (settings[1] - settings[0]) * progress;
            for k in [0, 13] {
                y.fixed_rows_mut::<3>(k + 7).copy_from(&V::new(v, 0., vz));
                y.fixed_rows_mut::<3>(k + 10).fill(0.);
            }
            let position = vector(y, 0) + rotation(y, 0) * V::new(p.hinge_x, p.hinge_y, p.hinge_z)
                - rotation(y, 13) * V::new(0., 0., 0.85);
            y.fixed_rows_mut::<3>(13).copy_from(&position);
            let air = (v - wind.x).max(0.);
            if env[0] == 1. {
                env[2] = 1. - (1. - env[2]) * (-h * (air * air / 9.).min(4.) / settings[4]).exp();
            }
            let target = if env[0] == 1. {
                target_rpm(u[0], voltage)
            } else {
                0.
            };
            *rpm = target + (*rpm - target) * (-h / MOTOR_TAU_S).exp();
            if t >= duration && env[2] >= 0.95 {
                env[0] = 2.;
                y[9] = 0.;
                y[22] = 0.;
            }
        } else {
            let mut parameters = p.clone();
            env[2] = 1. - (1. - env[2]) * (-h / settings[4]).exp();
            parameters.cl0 *= env[2];
            parameters.cla *= env[2];
            parameters.clbrake *= env[2];
            parameters.cm0 *= env[2];
            parameters.cma *= env[2];
            parameters.cmq *= env[2];
            advance(y, rpm, u, &parameters, mass, wind, voltage, h, 1, true)?;
            env[0] = if contact(y, &parameters, mass, settings[5], settings[0])? {
                3.
            } else {
                2.
            };
        }
        validate(y)?;
        if !rpm.is_finite() {
            return Err("nonfinite rotor state".into());
        }
    }
    Ok(())
}
