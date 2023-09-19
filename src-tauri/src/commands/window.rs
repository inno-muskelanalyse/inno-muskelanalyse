use diesel::Connection;
use log::{debug, error};
use tauri::Manager;
use tauri_plugin_store::StoreBuilder;
use uuid::Uuid;

use crate::{
    processor::ProcessorState,
    state::{AppState, WindowState},
};

#[tauri::command]
pub async fn open_project(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    processor_state: tauri::State<'_, ProcessorState>,
    path: String,
) -> Result<(), String> {
    debug!("Opening project: {}", path);
    // check if there's already a window with this project path
    let existing_window = state.is_project_already_open(&path);

    if existing_window {
        return Err("The selected project is currently open in another window. Please close the project before attempting to open it again.".into());
    }

    let mut connection = {
        // create connection to database
        let path = std::path::Path::new(&path);
        Some(diesel::SqliteConnection::establish(path.to_str().unwrap()).unwrap())
    };

    // run diesel migrations
    match crate::migrations::run_migrations(connection.as_mut().unwrap()) {
        Ok(_) => {}
        Err(error) => return Err(format!("The project file is corrupted: {}", error)),
    }

    // generate new window id
    let id = {
        use crate::schema::config::dsl::*;
        use diesel::prelude::*;

        // check if the project id is already in database
        let existing_id = config
            .select(value)
            .filter(key.eq("project_id"))
            .first::<String>(connection.as_mut().unwrap())
            .optional()
            .unwrap();

        // generate new id if it doesn't exist
        let project_id = match existing_id {
            Some(other_id) => Uuid::parse_str(&other_id).unwrap(),
            None => {
                let new_id = Uuid::new_v4();
                let new_config = crate::models::config::NewConfig {
                    key: "project_id".into(),
                    value: new_id.to_string(),
                };
                diesel::insert_into(crate::schema::config::table)
                    .values(new_config)
                    .execute(connection.as_mut().unwrap())
                    .unwrap();
                new_id
            }
        };

        project_id
    };

    let file_name = {
        // get file name from path without extension
        let path = std::path::Path::new(&path);
        path.file_stem().unwrap().to_str().unwrap().to_string()
    };

    // add window to windows
    let new_window = WindowState {
        id: id.clone(),
        project_path: path.clone().into(),
        file_name: file_name.clone(),
        connection,
    };

    state.add_window(new_window, path.clone());

    // store recent project
    {
        let handle = app.app_handle();
        let store_path = app
            .path_resolver()
            .app_data_dir()
            .unwrap()
            .join("recent-project.bin");

        debug!(
            "Storing recent project: {} in {}",
            path,
            store_path.display()
        );
        let mut store = StoreBuilder::new(handle, store_path).build();
        match store.insert(
            "recent-project".into(),
            serde_json::Value::String(path.clone()),
        ) {
            Ok(_) => {}
            Err(e) => {
                error!("Error storing recent project: {}", e);
            }
        }
        match store.save() {
            Ok(_) => {}
            Err(e) => {
                error!("Error saving store: {}", e);
            }
        }
    }

    // populate processor
    match processor_state.populate(&app, &id) {
        Ok(_) => {}
        Err(e) => {
            error!("Error populating processor: {}", e);
        }
    }

    // open new window
    let _new_window = tauri::WindowBuilder::new(
        &app,
        id.to_string(),
        tauri::WindowUrl::App("main/micrographs".into()),
    )
    .title(format!("Project: {}", file_name))
    .min_inner_size(650.0, 500.0)
    .theme(Some(tauri::Theme::Dark))
    .build()
    .unwrap();

    if app.windows().get("welcome").is_some() {
        app.windows().get("welcome").unwrap().close().unwrap();
    }

    Ok(())
}

#[tauri::command]
pub async fn recent_project(app: tauri::AppHandle) -> Result<String, String> {
    let store_path = app
        .path_resolver()
        .app_data_dir()
        .unwrap()
        .join("recent-project.bin");
    let mut store = StoreBuilder::new(app, store_path).build();
    match store.load() {
        Ok(_) => {}
        Err(e) => {
            error!("Error loading store: {}", e);
            return Err("Error loading store".into());
        }
    }

    match store.get("recent-project") {
        Some(path) => {
            debug!("Recent project found: {}", path);
            // check if the project still exists
            let check_path = std::path::Path::new(path.as_str().unwrap());
            if !check_path.exists() {
                debug!("Recent project doesn't exist anymore");
                return Err("Recent project doesn't exist anymore".into());
            }
            Ok(path.as_str().unwrap().to_string())
        }
        None => {
            debug!("No recent project found");
            Err("No recent project found".into())
        }
    }
}
