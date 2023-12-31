use multi_map::MultiMap;
use std::{path::PathBuf, sync::Mutex};
use uuid::Uuid;

#[derive(Default)]
pub struct AppState(pub Mutex<InnerAppState>);

#[derive(Default)]
pub struct InnerAppState {
    pub windows: MultiMap<Uuid, String, WindowState>,
}

#[derive(Default)]
pub struct WindowState {
    pub id: Uuid,
    pub project_path: PathBuf,
    pub file_name: String,
    pub connection: Option<diesel::SqliteConnection>,
}

mod cleanup;
mod micrograph;
mod segments;
mod window;
