use std::path::PathBuf;

pub mod pip;
pub mod system;
pub mod venv;

pub const PYTHON_REQUIRED_VERSION: &str = ">=3.9";

#[derive(Clone)]
pub struct PythonMetadata {
    pub version: String,
    pub path: PathBuf,
}

pub fn check_if_python_meets_requirements(meta: &PythonMetadata) -> Result<(), String> {
    let python_req = semver::VersionReq::parse(PYTHON_REQUIRED_VERSION).unwrap();
    let python_version = semver::Version::parse(&meta.version).unwrap();

    if !python_req.matches(&python_version) {
        return Err(format!(
            "Python version {} does not meet the requirements: {}",
            python_version, python_req
        ));
    }

    Ok(())
}
