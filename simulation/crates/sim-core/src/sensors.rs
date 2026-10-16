use crate::state::*;
pub struct Observation {
    pub position: V,
    pub velocity: V,
    pub gyro: V,
    pub euler: V,
    pub airspeed: f64,
}
pub fn observe(state: &State, imu: V, wind: V) -> Observation {
    let r = rotation(state, 0);
    let omega = vector(state, 10);
    let arm = r * imu;
    let (roll, pitch, yaw) = nalgebra::Rotation3::from_matrix_unchecked(r).euler_angles();
    Observation {
        position: vector(state, 0) + arm,
        velocity: vector(state, 7) + omega.cross(&arm),
        gyro: r.transpose() * omega,
        euler: V::new(roll, pitch, yaw),
        airspeed: (vector(state, 7) - wind).norm(),
    }
}
