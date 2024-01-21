use super::PythonMetadata;
use log::debug;
use std::path::{Path, PathBuf};
use tauri::api::process::Command;

#[memoize::memoize(SharedCache)]
pub fn resolve_python() -> Result<PythonMetadata, String> {
    let path = resolve_python_bin()?;
    let output = Command::new(path.display().to_string())
        .args(&["--version"])
        .output()
        .map_err(|e| e.to_string())?;

    // the output should be something like "Python 3.8.5"
    let version = output
        .stdout
        .split_whitespace()
        .nth(1)
        .ok_or_else(|| "Failed to parse python version".to_string())?
        .to_string();

    debug!("Detected python {} in {:?}", version, path);

    Ok(PythonMetadata { version, path })
}

fn resolve_python_bin() -> Result<PathBuf, String> {
    if let Ok(python_path) = std::env::var("PYTHON_BIN") {
        if Path::new(&python_path).exists() {
            return Ok(PathBuf::from(python_path));
        }
    }

    if let Ok(python_path) = which::which("python3") {
        return Ok(python_path);
    }

    if let Ok(python_path) = which::which("python") {
        return Ok(python_path);
    }

    Err("Python not found".to_string())
}
