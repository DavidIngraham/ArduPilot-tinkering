/// Travel-rate bounded brake actuator. Returns interval-average applied travel.
pub fn advance(
    position: &mut [f64; 2],
    target: [f64; 2],
    dt_s: f64,
    rate_mm_s: f64,
) -> crate::Result<[f64; 2]> {
    if !position
        .iter()
        .chain(target.iter())
        .chain([dt_s, rate_mm_s].iter())
        .all(|x| x.is_finite())
        || dt_s <= 0.
        || rate_mm_s <= 0.
    {
        return Err("invalid actuator input".into());
    }
    let mut average = [0.; 2];
    for i in 0..2 {
        let start = position[i];
        let end = start + (target[i] - start).clamp(-rate_mm_s * dt_s, rate_mm_s * dt_s);
        let travel = (end - start).abs() / rate_mm_s;
        average[i] = 0.5 * (start + end) * travel / dt_s + end * (1. - travel / dt_s);
        position[i] = end;
    }
    Ok(average)
}
