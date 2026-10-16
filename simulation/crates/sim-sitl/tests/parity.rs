use sim_sitl::{Backend, Preset};
fn backend(ground: bool) -> Backend {
    let preset: Preset = serde_json::from_str(include_str!(
        "../../../data/presets/as-built-trout-lake-sitl.json"
    ))
    .unwrap();
    Backend::new(preset, ground).unwrap()
}
fn packet(frame: u32, rate: u16, pwm: [u16; 4]) -> Vec<u8> {
    let mut result = Vec::new();
    result.extend(18458u16.to_le_bytes());
    result.extend(rate.to_le_bytes());
    result.extend(frame.to_le_bytes());
    for value in pwm.into_iter().chain([1500u16; 12]) {
        result.extend(value.to_le_bytes());
    }
    result
}
#[test]
fn duplicate_and_discontinuous_frames() {
    let mut b = backend(false);
    let p = packet(0, 400, [1500, 1500, 800, 2400]);
    let first = b.respond(&p).unwrap();
    let time = b.simulator.time_s;
    assert_eq!(first, b.respond(&p).unwrap());
    assert_eq!(time, b.simulator.time_s);
    assert!(b.respond(&packet(2, 400, [1500, 1500, 800, 2400])).is_err());
    assert!(b.respond(&[0; 40]).is_err());
    assert_eq!(time, b.simulator.time_s);
}
#[test]
fn independent_cpp_airborne_trace() {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../viewer/tools/fixtures/highdof-parity.json"
    ))
    .unwrap();
    let mut b = backend(false);
    for i in 0..1200 {
        b.released = i >= 20;
        let pwm = if i >= 700 {
            [1430, 1500, 1450, 2250]
        } else if i >= 200 {
            [1550, 1500, 960, 1900]
        } else {
            [1500, 1500, 800, 2400]
        };
        let response: serde_json::Value =
            serde_json::from_str(&b.respond(&packet(i, 400, pwm)).unwrap()).unwrap();
        if let Some(expected) = fixture["samples"]
            .as_array()
            .unwrap()
            .iter()
            .find(|x| x["frame"] == i)
        {
            for j in 0..26 {
                let error =
                    (b.simulator.state[j] - expected["truth"]["state"][j].as_f64().unwrap()).abs();
                assert!(error < 1e-7, "frame {i} state {j}: {error}");
            }
            for j in 0..3 {
                let error = (response["imu"]["accel_body"][j].as_f64().unwrap()
                    - expected["sensors"]["imu"]["accel_body"][j]
                        .as_f64()
                        .unwrap())
                .abs();
                assert!(error < 1e-6, "frame {i} acceleration {j}: {error}");
            }
        }
    }
}
