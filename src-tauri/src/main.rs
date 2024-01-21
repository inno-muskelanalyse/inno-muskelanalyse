#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;
use tauri_plugin_log::{fern::colors::ColoredLevelConfig, LogTarget};

mod commands;
mod image_manipulation;
mod migrations;
mod models;
mod processor;
mod python;
mod schema;
mod state;
mod utils;
mod vendor;

fn main() {
    let _ = fix_path_env::fix();
    tauri::Builder::default()
        .on_window_event(|event| {
            use tauri::WindowEvent;

            if let WindowEvent::CloseRequested { .. } = event.event() {
                // skip if the window is a viewer
                if event.window().label().starts_with("viewer") {
                    return;
                }
                // get state
                let app = event.window().app_handle();
                let state = app.state::<state::AppState>();

                let project_id = uuid::Uuid::parse_str(event.window().label()).unwrap();

                state.remove_window(&project_id);
            }
        })
        .manage(state::AppState(Default::default()))
        .manage(processor::ProcessorState(Default::default()))
        .invoke_handler(tauri::generate_handler![
            crate::commands::resolve_requirements::check_requirements,
            crate::commands::processor::get_processor_status,
            crate::commands::window::open_project,
            crate::commands::window::recent_project,
            crate::commands::micrographs::get_micrographs,
            crate::commands::micrographs::get_micrograph,
            crate::commands::micrographs::import_micrographs,
            crate::commands::micrographs::delete_micrograph,
            crate::commands::segments::get_segments,
            crate::commands::csv::export_csv,
        ])
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([LogTarget::Stdout, LogTarget::LogDir, LogTarget::Webview])
                .with_colors(ColoredLevelConfig::default())
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
