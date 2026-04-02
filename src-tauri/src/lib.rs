mod server;
mod tray;

use std::fs;
use std::path::PathBuf;
use std::sync::mpsc;
use tauri::Emitter;

#[tauri::command]
fn load_pet() -> Result<serde_json::Value, String> {
    // Look for .pet/*.json in current working directory
    let cwd_pet = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .join(".pet");

    if cwd_pet.exists() {
        return load_first_pet(&cwd_pet);
    }

    // Fallback to home directory
    let home_pet = dirs::home_dir()
        .ok_or_else(|| "No home directory".to_string())?
        .join(".pet");

    load_first_pet(&home_pet)
}

fn load_first_pet(dir: &PathBuf) -> Result<serde_json::Value, String> {
    if !dir.exists() {
        return Err("No .pet directory found".into());
    }

    let entries: Vec<_> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "json"))
        .collect();

    let entry = entries.first().ok_or("No pet files found in .pet/")?;
    let content = fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (tx, rx) = mpsc::channel();
    server::start_server(tx);

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_pet])
        .setup(|app| {
            tray::setup_tray(app)?;

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                while let Ok(event) = rx.recv() {
                    let _ = handle.emit("pet-event", &event);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
