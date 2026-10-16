//! ArduPilot servo packet decoding. Transport remains outside the physics core.
pub struct ServoPacket {
    pub rate: u16,
    pub frame: u32,
    pub pwm: Vec<u16>,
}
pub fn decode(data: &[u8]) -> Result<ServoPacket, String> {
    if data.len() != 40 && data.len() != 72 {
        return Err("expected 16 or 32 channel servo packet".into());
    }
    let word = |offset| u16::from_le_bytes([data[offset], data[offset + 1]]);
    let magic = if data.len() == 40 { 18458 } else { 29569 };
    let rate = word(2);
    if word(0) != magic || !(1..=2000).contains(&rate) {
        return Err("invalid servo packet magic or rate".into());
    }
    Ok(ServoPacket {
        rate,
        frame: u32::from_le_bytes(data[4..8].try_into().unwrap()),
        pwm: (8..data.len()).step_by(2).map(word).collect(),
    })
}

use serde::{Deserialize, Serialize};
use sim_core::{
    actuators, sensors,
    state::{rotation, V},
    Simulator,
};
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Preset {
    pub config: sim_core::SimulationConfig,
    pub imu_offset_m: [f64; 3],
    pub brake_offsets_m: [f64; 2],
    pub brake_rate_mm_s: f64,
    pub trim_command: [f64; 3],
}
pub struct Backend {
    pub simulator: Simulator,
    pub released: bool,
    pub wind: [f64; 3],
    preset: Preset,
    brakes: [f64; 2],
    frame: Option<u32>,
    cached: String,
}
impl Backend {
    pub fn new(preset: Preset, ground: bool) -> Result<Self, String> {
        let mut simulator = Simulator::new(preset.config.clone())?;
        if !preset
            .imu_offset_m
            .iter()
            .chain(preset.brake_offsets_m.iter())
            .chain(preset.trim_command.iter())
            .all(|v| v.is_finite())
            || !preset.brake_rate_mm_s.is_finite()
            || preset.brake_rate_mm_s <= 0.
        {
            return Err("invalid adapter preset".into());
        }
        if ground {
            simulator.ground_start();
        }
        Ok(Self {
            simulator,
            released: false,
            wind: [0.; 3],
            brakes: [preset.trim_command[1], preset.trim_command[2]],
            preset,
            frame: None,
            cached: String::new(),
        })
    }
    pub fn respond(&mut self, data: &[u8]) -> Result<String, String> {
        let packet = decode(data)?;
        if self.frame == Some(packet.frame) {
            return Ok(self.cached.clone());
        }
        if self
            .frame
            .is_some_and(|previous| packet.frame != previous.wrapping_add(1))
        {
            return Err("SITL frame discontinuity; restart backend".into());
        }
        let dt = 1. / f64::from(packet.rate);
        let imu = V::from(self.preset.imu_offset_m);
        let wind = V::from(self.wind);
        let before = sensors::observe(&self.simulator.state, imu, wind);
        if self.released {
            let scale = std::f64::consts::PI * 55. / 360. * 0.1;
            let command = [
                (f64::from(packet.pwm[0].clamp(1000, 2000)) - 1000.) / 1000.,
                (f64::from(packet.pwm[2].clamp(800, 2100)) - 800.) * scale,
                (2400. - f64::from(packet.pwm[3].clamp(900, 2400))) * scale,
            ];
            let applied = actuators::advance(
                &mut self.brakes,
                [command[1], command[2]],
                dt,
                self.preset.brake_rate_mm_s,
            )?;
            let mut pull = [0.; 2];
            for i in 0..2 {
                pull[i] = applied[i] / 1000. - self.preset.brake_offsets_m[i];
                if self.simulator.config.parameters.routing_enabled <= 0. {
                    pull[i] = pull[i].max(0.);
                }
            }
            self.simulator.config.substeps = (dt / 0.00125).ceil() as usize;
            self.simulator.release();
            self.simulator
                .step([command[0], pull[0], pull[1]], self.wind, dt)?;
        } else {
            if self.simulator.surface.is_none() {
                for i in 0..3 {
                    let delta = self.simulator.state[7 + i] * dt;
                    self.simulator.state[i] += delta;
                    self.simulator.state[13 + i] += delta;
                }
            }
            self.simulator.time_s += dt;
        }
        let obs = sensors::observe(&self.simulator.state, imu, wind);
        let specific = rotation(&self.simulator.state, 0).transpose()
            * ((obs.velocity - before.velocity) / dt - V::new(0., 0., 9.80665));
        let message = serde_json::json!({"timestamp":self.simulator.time_s,"battery":{"voltage":self.simulator.config.voltage_v},"imu":{"gyro":obs.gyro.as_slice(),"accel_body":specific.as_slice()},"position":obs.position.as_slice(),"attitude":obs.euler.as_slice(),"velocity":obs.velocity.as_slice(),"airspeed":obs.airspeed,"velocity_wind":self.wind});
        self.cached = format!("\n{message}\n");
        self.frame = Some(packet.frame);
        Ok(self.cached.clone())
    }
}
