use std::path::PathBuf;

use super::PythonMetadata;

pub fn resolve_python(venv_name: &str, app: &tauri::AppHandle) -> Result<PythonMetadata, String> {
    let path = resolve_python_bin(venv_name, app)?;
    let output = tauri::api::process::Command::new(path.display().to_string())
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

    log::debug!(
        "VENV {}: Detected python {} in {:?}",
        venv_name,
        version,
        path
    );

    Ok(PythonMetadata { version, path })
}

fn resolve_python_bin(venv_name: &str, app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let venv_path = app
        .path_resolver()
        .app_data_dir()
        .unwrap()
        .join("venv")
        .join(venv_name);

    // the python binaries are located in different places depending on the OS
    let python_path = match cfg!(target_os = "windows") {
        true => venv_path.join("Scripts").join("python.exe"),
        false => venv_path.join("bin").join("python"),
    };

    if python_path.exists() {
        return Ok(python_path);
    }

    Err("Python not found".to_string())
}

fn get_venv_path(venv_name: &str, app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let venv_path = app
        .path_resolver()
        .app_data_dir()
        .unwrap()
        .join("venv")
        .join(venv_name);

    Ok(venv_path)
}

pub fn check_if_venv_exists(venv_name: &str, app: &tauri::AppHandle) -> bool {
    let venv_path = get_venv_path(venv_name, app).unwrap();

    venv_path.exists()
}

pub fn create_venv(venv_name: &str, app: &tauri::AppHandle) -> Result<(), String> {
    let venv_path = get_venv_path(venv_name, app).unwrap();

    let python_path = super::system::resolve_python()?.path;
    let output = tauri::api::process::Command::new(python_path.display().to_string())
        .args(&["-m", "venv", venv_path.to_str().unwrap()])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(format!("Failed to create venv: {}", &output.stderr));
    }

    Ok(())
}

pub fn destroy_venv(venv_name: &str, app: &tauri::AppHandle) -> Result<(), String> {
    let venv_path = get_venv_path(venv_name, app).unwrap();

    if !venv_path.exists() {
        return Ok(());
    }

    std::fs::remove_dir_all(venv_path).map_err(|e| e.to_string())?;

    Ok(())
}
