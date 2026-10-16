use std::{
    io,
    net::UdpSocket,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};
fn run() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.is_empty() || args.iter().any(|a| a == "--help") {
        println!("sim-sitl PRESET.json [--ground] [--release] [--port PORT]\nBinds localhost; press Enter to release after SITL initializes.");
        return Ok(());
    }
    let preset = serde_json::from_str(&std::fs::read_to_string(&args[0])?)?;
    let port = if let Some(i) = args.iter().position(|a| a == "--port") {
        args.get(i + 1).ok_or("missing port")?.parse::<u16>()?
    } else {
        9002
    };
    let mut backend = sim_sitl::Backend::new(preset, args.iter().any(|a| a == "--ground"))?;
    let released = Arc::new(AtomicBool::new(args.iter().any(|a| a == "--release")));
    let flag = released.clone();
    std::thread::spawn(move || {
        let mut line = String::new();
        if io::stdin().read_line(&mut line).is_ok_and(|n| n > 0) {
            flag.store(true, Ordering::Relaxed);
        }
    });
    let socket = UdpSocket::bind(("127.0.0.1", port))?;
    eprintln!("Listening on 127.0.0.1:{port}; Enter releases physics");
    let mut buffer = [0u8; 2048];
    loop {
        let (n, peer) = socket.recv_from(&mut buffer)?;
        backend.released = released.load(Ordering::Relaxed);
        match backend.respond(&buffer[..n]) {
            Ok(response) => {
                socket.send_to(response.as_bytes(), peer)?;
            }
            Err(e) => eprintln!("Rejected packet: {e}"),
        }
    }
}
fn main() {
    if let Err(e) = run() {
        eprintln!("{e}");
        std::process::exit(1);
    }
}
