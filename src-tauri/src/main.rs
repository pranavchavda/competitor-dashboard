// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

// Global variable to hold the Next.js server process
static mut NEXTJS_PROCESS: Option<Arc<Mutex<Option<Child>>>> = None;

#[tauri::command]
fn start_nextjs_server() -> Result<String, String> {
    // Start Next.js server in a separate thread
    let process_handle = Arc::new(Mutex::new(None::<Child>));
    
    unsafe {
        NEXTJS_PROCESS = Some(process_handle.clone());
    }
    
    let handle = process_handle.clone();
    thread::spawn(move || {
        // Try to find the project directory by looking for package.json
        let project_dir = find_project_directory();
        
        if let Some(dir) = project_dir {
            println!("Found project directory: {:?}", dir);
            
            // Build the app first
            let build_result = Command::new("npm")
                .args(&["run", "build"])
                .current_dir(&dir)
                .status();
                
            match build_result {
                Ok(status) if status.success() => {
                    println!("Build completed successfully");
                },
                Ok(status) => {
                    eprintln!("Build failed with status: {}", status);
                    return;
                },
                Err(e) => {
                    eprintln!("Failed to run build: {}", e);
                    return;
                }
            }
            
            // Start the server
            match Command::new("npm")
                .args(&["run", "start"])
                .current_dir(&dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
            {
                Ok(child) => {
                    println!("Next.js server started successfully");
                    if let Ok(mut process) = handle.lock() {
                        *process = Some(child);
                    }
                }
                Err(e) => eprintln!("Failed to start Next.js server: {}", e),
            }
        } else {
            eprintln!("Could not find project directory with package.json");
        }
    });
    
    // Give the server time to start
    thread::sleep(Duration::from_secs(8)); // Increased timeout
    Ok("Server started".to_string())
}

fn find_project_directory() -> Option<PathBuf> {
    // Start from the binary location
    if let Ok(exe_path) = env::current_exe() {
        let mut dir = exe_path.parent()?.to_path_buf();
        
        // Look up the directory tree for package.json (max 10 levels)
        for _ in 0..10 {
            let package_json = dir.join("package.json");
            if package_json.exists() {
                return Some(dir);
            }
            if !dir.pop() {
                break;
            }
        }
    }
    
    // Fallback: try current working directory
    let current_dir = env::current_dir().ok()?;
    if current_dir.join("package.json").exists() {
        return Some(current_dir);
    }
    
    None
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|_app| {
            // Only start Next.js server in production mode
            #[cfg(not(debug_assertions))]
            {
                let _ = start_nextjs_server();
            }
            
            // In debug mode, just continue without server startup
            println!("Tauri app starting in debug mode - expecting Next.js on localhost:3000");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![start_nextjs_server])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // In production mode, clean up Next.js server when window closes
                #[cfg(not(debug_assertions))]
                unsafe {
                    if let Some(process_handle) = &NEXTJS_PROCESS {
                        if let Ok(mut process) = process_handle.lock() {
                            if let Some(mut child) = process.take() {
                                let _ = child.kill();
                            }
                        }
                    }
                }
                println!("Window closing");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}