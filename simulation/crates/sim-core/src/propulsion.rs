#[path = "propeller_data.rs"]
mod data;
use data::{CP_GRID, CT_GRID, RPM_GRID};
pub const MOTOR_TAU_S: f64 = 0.01756125311487475;
pub fn target_rpm(throttle: f64, voltage: f64) -> f64 {
    743.5778222336925
        * voltage
        * (throttle - 0.0005141016498671315)
            .max(0.)
            .powf(0.9086807307118114)
}
fn coefficient(rpm: f64, axial: f64, table: &[f64]) -> f64 {
    if !rpm.is_finite() || !axial.is_finite() {
        return f64::NAN;
    }
    if !(RPM_GRID[0]..RPM_GRID[24]).contains(&rpm) {
        return 0.;
    }
    let i = RPM_GRID.partition_point(|x| *x <= rpm) - 1;
    let f = (rpm - RPM_GRID[i]) / (RPM_GRID[i + 1] - RPM_GRID[i]);
    let j = (axial.max(0.) / (rpm / 60. * 0.2286)).clamp(0., 2.) * 200.;
    let k = (j as usize).min(399);
    let g = j - k as f64;
    let a = table[i * 401 + k] * (1. - g) + table[i * 401 + k + 1] * g;
    let b = table[(i + 1) * 401 + k] * (1. - g) + table[(i + 1) * 401 + k + 1] * g;
    a * (1. - f) + b * f
}
pub fn thrust(rpm: f64, axial: f64) -> f64 {
    1.225 * (rpm / 60.).powi(2) * 0.2286_f64.powi(4) * coefficient(rpm, axial, &CT_GRID)
}
pub fn torque(rpm: f64, axial: f64) -> f64 {
    1.225 * (rpm / 60.).powi(2) * 0.2286_f64.powi(5) / (2. * std::f64::consts::PI)
        * coefficient(rpm, axial, &CP_GRID)
}
