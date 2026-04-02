mod server;
mod tray;

use std::fs;
use std::path::PathBuf;
use std::sync::mpsc;
use tauri::{Emitter, Manager};

#[tauri::command]
fn load_pet() -> Result<serde_json::Value, String> {
    // Search .pet/ in multiple locations
    let search_dirs = build_search_dirs();
    for dir in &search_dirs {
        let pet_dir = dir.join(".pet");
        if pet_dir.exists() {
            if let Ok(pet) = load_first_pet(&pet_dir) {
                return Ok(pet);
            }
        }
    }
    Err(format!("No .pet/ directory found. Searched: {:?}", search_dirs))
}

fn build_search_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    // 1. Current working directory
    if let Ok(cwd) = std::env::current_dir() {
        let resolved = if cwd.ends_with("src-tauri") {
            cwd.parent().unwrap().to_path_buf()
        } else {
            cwd
        };
        dirs.push(resolved);
    }

    // 2. Home directory
    if let Some(home) = dirs::home_dir() {
        dirs.push(home);
    }

    // 3. Walk up from cwd to find .pet/ in parent directories
    if let Ok(cwd) = std::env::current_dir() {
        let mut parent = cwd.as_path();
        while let Some(p) = parent.parent() {
            if p.join(".pet").exists() {
                dirs.push(p.to_path_buf());
                break;
            }
            parent = p;
        }
    }

    dirs
}

fn load_first_pet(dir: &PathBuf) -> Result<serde_json::Value, String> {
    let entries: Vec<_> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "json"))
        .collect();

    let entry = entries.first().ok_or("No pet JSON files found")?;
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
            // Clear window background + remove native shadow
            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)));
            let _ = window.set_shadow(false);

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
