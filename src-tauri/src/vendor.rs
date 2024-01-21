use std::path::PathBuf;

use log::debug;

pub struct Vendor {
    name: String,
    src_path: PathBuf,
}

pub fn prepare_python_vendors(app: &tauri::AppHandle) -> Result<(), String> {
    let vendors = get_python_vendors(app)?;

    debug!("Found {} python vendors", vendors.len());

    vendors.into_iter().try_for_each(|vendor| {
        match crate::python::venv::check_if_venv_exists(&vendor.name, app) {
            true => Ok(()),
            false => crate::python::venv::create_venv(&vendor.name, app),
        }?;

        debug!(
            "Checking if python vendor {} meets requirements",
            &vendor.name
        );

        let meta = crate::python::venv::resolve_python(&vendor.name, app)?;

        match crate::python::check_if_python_meets_requirements(&meta) {
            Ok(_) => Ok(()),
            Err(_) => {
                crate::python::venv::destroy_venv(&vendor.name, app)?;
                crate::python::venv::create_venv(&vendor.name, app)
            }
        }?;

        // check if there's a requirements.txt and therefore if we need to install the dependencies
        let requirements_txt_path = vendor.src_path.join("requirements.txt");

        if requirements_txt_path.exists() {
            match crate::python::pip::install_requirements(&requirements_txt_path, &meta) {
                Ok(_) => {
                    debug!("Installed requirements for vendor {}", &vendor.name);
                }
                Err(e) => {
                    debug!(
                        "Failed to install requirements for vendor {}: {}",
                        &vendor.name, e
                    );
                    return Err(e);
                }
            }
        }

        Ok(())
    })
}

pub fn get_python_vendors(app: &tauri::AppHandle) -> Result<Vec<Vendor>, String> {
    let resource_path = app
        .path_resolver()
        .resource_dir()
        .expect("Failed to get resource dir");

    let vendor_dir = resource_path.join("vendor");

    if !vendor_dir.exists() {
        return Ok(vec![]);
    }

    let mut vendors: Vec<Vendor> = vec![];

    for entry in std::fs::read_dir(vendor_dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        // check if there is a main.py or a requirements.txt
        let main_py_path = path.join("main.py");
        let requirements_txt_path = path.join("requirements.txt");

        if !main_py_path.exists() && !requirements_txt_path.exists() {
            continue;
        }

        let name = path.file_name().unwrap().to_str().unwrap().to_string();

        vendors.push(Vendor {
            name,
            src_path: path,
        });
    }

    Ok(vendors)
}
