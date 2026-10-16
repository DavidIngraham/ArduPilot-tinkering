fn main() -> Result<(), Box<dyn std::error::Error>> {
    _native::stub_info()?.generate()?;
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("python/microagu_sim/_native/__init__.pyi");
    let source = std::fs::read_to_string(&path)?;
    std::fs::write(path, format!("{}\n", source.trim_end()))?;
    Ok(())
}
