use std::path::Path;

use super::PythonMetadata;

pub fn install_requirements(
    requirements_txt_path: &Path,
    python: &PythonMetadata,
) -> Result<(), String> {
    // check if requirements.txt exists
    if !requirements_txt_path.exists() {
        return Err(format!(
            "requirements.txt not found in {:?}",
            requirements_txt_path
        ));
    }

    // install requirements
    let command = tauri::api::process::Command::new(python.path.display().to_string())
        .args([
            "-m",
            "pip",
            "install",
            "-r",
            requirements_txt_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| e.to_string())?;

    match command.status.success() {
        true => Ok(()),
        false => Err(format!(
            "Failed to install requirements: {}",
            &command.stderr
        )),
    }
}
