use std::io::Read;
fn run() -> Result<(), Box<dyn std::error::Error>> {
    let command = std::env::args().nth(1).unwrap_or_default();
    if command == "typescript" {
        print!("{}", sim_io::typescript_types());
        return Ok(());
    }
    if command == "schema" {
        println!("{}", sim_io::config_schema());
        return Ok(());
    }
    if command == "--help" || command.is_empty() {
        println!("microagu-sim schema | validate | replay\nvalidate/replay read JSON from stdin; replay emits versioned JSON.");
        return Ok(());
    }
    let mut input = String::new();
    std::io::stdin().read_to_string(&mut input)?;
    match command.as_str() {
        "validate" => {
            sim_io::parse_config(&input)?;
            println!("valid");
        }
        "replay" => {
            let request = serde_json::from_str(&input)?;
            println!("{}", serde_json::to_string(&sim_io::replay(request)?)?);
        }
        _ => return Err("unknown command".into()),
    }
    Ok(())
}
fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
