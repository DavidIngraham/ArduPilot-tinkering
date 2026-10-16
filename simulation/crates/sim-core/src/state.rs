use nalgebra::{Matrix3, Quaternion, SMatrix, SVector, UnitQuaternion, Vector3};
pub type V = Vector3<f64>;
pub type M = Matrix3<f64>;
pub type V6 = SVector<f64, 6>;
pub type M6 = SMatrix<f64, 6, 6>;
pub type G = SMatrix<f64, 3, 6>;
/// Packed compatibility layout: two [position, quaternion xyzw, velocity, omega] bodies.
pub type State = SVector<f64, 26>;
pub const PAYLOAD: usize = 0;
pub const CANOPY: usize = 13;
pub fn vector(y: &State, start: usize) -> V {
    y.fixed_rows::<3>(start).into_owned()
}
pub fn rotation(y: &State, body: usize) -> M {
    UnitQuaternion::new_normalize(Quaternion::new(
        y[body + 6],
        y[body + 3],
        y[body + 4],
        y[body + 5],
    ))
    .to_rotation_matrix()
    .into_inner()
}
pub fn skew(v: V) -> M {
    M::new(0., -v.z, v.y, v.z, 0., -v.x, -v.y, v.x, 0.)
}
pub fn constraint(arm: V) -> G {
    let mut g = G::zeros();
    g.fixed_view_mut::<3, 3>(0, 0).copy_from(&M::identity());
    g.fixed_view_mut::<3, 3>(0, 3).copy_from(&-skew(arm));
    g
}
pub fn spatial_rotation(r: M) -> M6 {
    let mut result = M6::zeros();
    result.fixed_view_mut::<3, 3>(0, 0).copy_from(&r);
    result.fixed_view_mut::<3, 3>(3, 3).copy_from(&r);
    result
}
pub fn normalize(y: &mut State) {
    for start in [3, 16] {
        let q = y.fixed_rows::<4>(start).normalize();
        y.fixed_rows_mut::<4>(start).copy_from(&q);
    }
}
pub fn validate(y: &State) -> crate::Result<()> {
    if !y.iter().all(|v| v.is_finite()) || y.norm() > 1e6 {
        return Err("nonfinite or divergent state".into());
    }
    for start in [3, 16] {
        if y.fixed_rows::<4>(start).norm() < 1e-12 {
            return Err("zero quaternion".into());
        }
    }
    Ok(())
}
