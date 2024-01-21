use log::debug;

#[tauri::command]
pub async fn check_requirements(app: tauri::AppHandle) -> Result<(), String> {
    // check if python meets the requirements
    let python = crate::python::system::resolve_python()?;
    crate::python::check_if_python_meets_requirements(&python)?;

    // check if the python vendors meet the requirements
    debug!("Checking python vendors");
    crate::vendor::prepare_python_vendors(&app)?;

    Ok(())
}
