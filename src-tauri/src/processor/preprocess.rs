use std::path::Path;

use crate::{models::segments::NewSegment, state::AppState};
use log::{debug, error};
use serde::Deserialize;
use tauri::Manager;

use super::{Processor, ProcessorState};
use uuid::Uuid;

#[derive(Deserialize, Debug)]
struct PreprocessingResultItem {
    path: String,
    y: usize,
    x: usize,
    height: usize,
    width: usize,
}

impl Processor {
    pub fn preprocess(&self) {
        let app = self.app.app_handle();
        let project_id = self.project_id.clone();
        let micrograph_id = self.micrograph_id.clone();

        tauri::async_runtime::spawn(async move {
            let state = app.state::<AppState>();

            match state.get_micrograph(&project_id, &micrograph_id) {
                Ok(micrograph) => {
                    if micrograph.status == crate::models::micrographs::Status::Pending {
                        debug!("Micrograph was not imported yet, importing it now and skipping preprocessing");
                        todo!("Import micrograph");
                    }

                    // verify that the micrograph path still exists
                    if !Path::new(&micrograph.import_path).exists() {
                        debug!("Micrograph path does not exist, skipping preprocessing");
                        return;
                    }

                    // get cache directory
                    let cache_dir = app
                        .path_resolver()
                        .app_cache_dir()
                        .unwrap()
                        .join("preprocessing")
                        .join(&project_id.to_string())
                        .join(&micrograph_id.to_string());

                    // create cache directory if it doesn't exist
                    if !cache_dir.exists() {
                        std::fs::create_dir_all(&cache_dir).unwrap();
                    }

                    let preprocessing = tauri::api::process::Command::new(
                        crate::utils::resolve_bin_path(&app, "preprocessing"),
                    )
                    .current_dir(crate::utils::resolve_bin_dir(&app))
                    .args(&[
                        micrograph.import_path.replace("\\", "/").as_str(),
                        cache_dir.to_str().unwrap().replace("\\", "/").as_str(),
                        cache_dir
                            .join("data.json")
                            .to_str()
                            .unwrap()
                            .replace("\\", "/")
                            .as_str(),
                    ]);

                    debug!("Running preprocessing: {:?}", preprocessing);

                    let preprocessing = preprocessing.output();

                    match preprocessing {
                        Ok(output) => {
                            debug!("Preprocessing output: {:?}", output);
                            // verify that the process exited successfully
                            if !output.status.success() {
                                error!("Preprocessing failed: {:?}", output);
                                return;
                            }

                            // trim output to the actual JSON (remove warnings)
                            // trim from the first '[' to the last ']'
                            let output = output.stdout;

                            let output = output.trim_start_matches(|c| c != '[');
                            let output = output.trim_end_matches(|c| c != ']');

                            // remove all newline characters
                            let output = output.replace("\n", "");

                            // remove all commas that are next to a closing bracket or opening bracket (this is a hack to fix the dirty JSON)
                            let output = output.replace("],", "]");
                            let output = output.replace("[,", "[");

                            debug!("Preprocessing output: {}", output);

                            let result: Vec<PreprocessingResultItem> =
                                serde_json::from_str(&output).unwrap();

                            debug!("Preprocessing result: {:?}", result);

                            // add segments to database
                            let mut segments = Vec::<NewSegment>::new();

                            for item in result {
                                let binary_img = std::fs::read(&item.path).unwrap();

                                segments.push(NewSegment {
                                    micrograph_id: micrograph.uuid.clone(),
                                    location_x: Some(item.x as i32),
                                    location_y: Some(item.y as i32),
                                    width: Some(item.width as i32),
                                    height: Some(item.height as i32),
                                    measured_angle: None,
                                    measured_width: None,
                                    measured_length: None,
                                    measured_midpoint_x: None,
                                    measured_midpoint_y: None,
                                    status: crate::models::segments::Status::New,
                                    uuid: Uuid::new_v4().to_string(),
                                    binary_img,
                                });
                            }

                            match state.add_segments(&project_id, segments) {
                                Ok(_) => {
                                    // update micrograph status
                                    match state.update_micrograph_status(
                                        &project_id,
                                        &micrograph_id,
                                        crate::models::micrographs::Status::Segmented,
                                    ) {
                                        Ok(_) => {
                                            debug!("Successfully added segments to database");
                                        }
                                        Err(err) => {
                                            error!("Failed to update micrograph status: {:?}", err);
                                        }
                                    }

                                    // send event to frontend
                                    let _ = app.emit_to(
                                        &project_id.to_string(),
                                        "UPDATE_MICROGRAPHS",
                                        (),
                                    );

                                    // kick off analysis
                                    let processor_state = app.state::<ProcessorState>();
                                    let processor =
                                        processor_state.0.get(&micrograph_id.to_string());

                                    match processor {
                                        Some(processor) => {
                                            processor.run_analysis();
                                        }
                                        None => {
                                            error!("Failed to get processor");
                                        }
                                    }
                                }
                                Err(err) => {
                                    log::error!("Failed to add segments to database: {:?}", err);
                                }
                            };
                        }
                        Err(err) => {
                            log::error!("Failed to run preprocessing: {:?}", err);
                        }
                    }
                }
                Err(err) => {
                    log::error!("Failed to get micrograph: {:?}", err);
                }
            }
        });
    }
}
