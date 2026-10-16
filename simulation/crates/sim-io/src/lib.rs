use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sim_core::SimulationConfig;
use ts_rs::TS;
pub fn typescript_types() -> String {
    let config = ts_rs::Config::default();
    format!(
        "// Generated from Rust; do not edit.\nexport {}\nexport {}\n",
        sim_core::Parameters::decl(&config),
        SimulationConfig::decl(&config)
    )
}
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReplayRequest {
    pub config: SimulationConfig,
    pub commands: Vec<[f64; 3]>,
    pub wind_ned_mps: [f64; 3],
    pub dt_s: f64,
}
#[derive(Serialize)]
pub struct Recording {
    pub schema_version: u32,
    pub simulator_version: &'static str,
    pub configuration_sha256: String,
    pub samples: Vec<Vec<f64>>,
}
pub fn parse_config(text: &str) -> Result<SimulationConfig, String> {
    let config: SimulationConfig = serde_json::from_str(text).map_err(|e| e.to_string())?;
    config.validate()?;
    Ok(config)
}
pub fn replay(request: ReplayRequest) -> Result<Recording, String> {
    request.config.validate()?;
    let hash = format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(&request.config).map_err(|e| e.to_string())?)
    );
    let mut sim = sim_core::Simulator::new(request.config)?;
    let mut samples = Vec::new();
    for command in request.commands {
        sim.step(command, request.wind_ned_mps, request.dt_s)?;
        let mut row = vec![sim.time_s];
        row.extend_from_slice(sim.state.as_slice());
        row.push(sim.rpm);
        samples.push(row);
    }
    Ok(Recording {
        schema_version: 1,
        simulator_version: env!("CARGO_PKG_VERSION"),
        configuration_sha256: hash,
        samples,
    })
}
pub fn config_schema() -> String {
    serde_json::to_string_pretty(&schemars::schema_for!(SimulationConfig))
        .expect("schema serialization")
}
