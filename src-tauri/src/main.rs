// Show console window for debugging in debug builds, hide in release
#![cfg_attr(all(not(debug_assertions), not(feature = "debug-console")), windows_subsystem = "windows")]

use std::env;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::Manager;

// Global variable to hold the Express server process
static mut EXPRESS_PROCESS: Option<Arc<Mutex<Option<Child>>>> = None;

#[tauri::command]
fn get_app_info() -> Result<String, String> {
    Ok("Competitor Dashboard v0.1.0".to_string())
}

fn find_project_directory(app_handle: Option<&tauri::AppHandle>) -> Option<PathBuf> {
    // First, try to get the resource directory for bundled resources (release builds)
    if let Some(handle) = app_handle {
        if let Ok(resource_dir) = handle.path().resource_dir() {
            println!("📁 Checking resource directory: {:?}", resource_dir);
            let package_json = resource_dir.join("package.json");
            if package_json.exists() {
                println!("✅ Found package.json in resource directory: {:?}", package_json);
                return Some(resource_dir);
            }
        }
    }
    
    // Fallback for dev builds: Start from binary location and work upwards
    let mut current_path = env::current_exe().ok()?;
    
    println!("📁 Binary location: {:?}", current_path);
    
    // Go up directories looking for package.json (dev mode)
    for level in 0..5 {
        current_path.pop(); // Remove one level
        let package_json = current_path.join("package.json");
        
        println!("   Checking level {}: {:?}", level, package_json);
        
        if package_json.exists() {
            println!("✅ Found package.json at: {:?}", package_json);
            return Some(current_path);
        }
    }
    
    // Final fallback: try current working directory
    let cwd = env::current_dir().ok()?;
    let package_json = cwd.join("package.json");
    if package_json.exists() {
        return Some(cwd);
    }
    
    None
}

fn start_express_server(app_handle: tauri::AppHandle) {
    println!("🔧 Starting Express API server...");
    
    // Start Express server in a separate thread
    let process_handle = Arc::new(Mutex::new(None::<Child>));
    
    unsafe {
        EXPRESS_PROCESS = Some(process_handle.clone());
    }
    
    let handle = process_handle.clone();
    thread::spawn(move || {
        // Try to find the project directory by looking for package.json
        let project_dir = find_project_directory(Some(&app_handle));
        
        if let Some(dir) = project_dir {
            println!("Found project directory: {:?}", dir);
            
            // Set the DATABASE_URL environment variable to the correct path
            let db_path = dir.join("prisma/competitor_products.db");
            env::set_var("DATABASE_URL", format!("file:{}", db_path.display()));
            println!("📊 Database path set to: {}", db_path.display());
            
            // Create database directory if it doesn't exist
            if let Some(parent_dir) = db_path.parent() {
                if !parent_dir.exists() {
                    println!("📁 Creating prisma directory...");
                    let _ = std::fs::create_dir_all(parent_dir);
                }
            }
            
            // Generate Prisma client first
            println!("🔨 Generating Prisma client...");
            let prisma_result = Command::new("npx")
                .args(&["prisma", "generate"])
                .current_dir(&dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .status();
                
            match prisma_result {
                Ok(status) if status.success() => {
                    println!("✅ Prisma client generated successfully");
                },
                Ok(status) => {
                    eprintln!("⚠️  Prisma generate failed with status: {}", status);
                },
                Err(e) => {
                    eprintln!("⚠️  Failed to run prisma generate: {}", e);
                }
            }
            
            // Create/migrate database if needed
            if !db_path.exists() {
                println!("🗃️  Creating database schema...");
                let db_push_result = Command::new("npx")
                    .args(&["prisma", "db", "push"])
                    .current_dir(&dir)
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped())
                    .status();
                
                match db_push_result {
                    Ok(status) if status.success() => {
                        println!("✅ Database schema created successfully");
                    },
                    Ok(status) => {
                        eprintln!("⚠️  Database push failed with status: {}", status);
                    },
                    Err(e) => {
                        eprintln!("⚠️  Failed to run prisma db push: {}", e);
                    }
                }
            }
            
            // Start the Express server
            println!("Starting Express server...");
            let server_result = Command::new("pnpm")
                .args(&["run", "server:dev"])
                .current_dir(&dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn();
                
            match server_result {
                Ok(child) => {
                    println!("✅ Express server process started");
                    
                    // Store the process handle
                    if let Ok(mut process) = handle.lock() {
                        *process = Some(child);
                    }
                    
                    // Give the server time to start
                    thread::sleep(Duration::from_secs(5));
                    
                    println!("🌐 API server should be running on http://localhost:3005");
                },
                Err(e) => {
                    eprintln!("❌ Failed to start Express server: {}", e);
                    eprintln!("Make sure pnpm is installed and the project dependencies are available");
                }
            }
        } else {
            eprintln!("❌ Could not find project directory. Make sure package.json exists in the project root.");
        }
    });
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_app_info])
        .setup(|app| {
            // Print startup info
            println!("🚀 Tauri application starting...");
            println!("📱 Serving static files from dist directory");
            println!("🎯 Competitor Dashboard v0.1.0");
            
            // Start the Express API server
            let app_handle = app.handle().clone();
            start_express_server(app_handle);
            
            // Get the main window
            if let Some(_window) = app.get_webview_window("main") {
                println!("✅ Main window initialized");
            }
            
            Ok(())
        })
        .on_window_event(|_window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { .. } => {
                    // Clean up Express server when closing
                    unsafe {
                        if let Some(process_handle) = &EXPRESS_PROCESS {
                            if let Ok(mut process) = process_handle.lock() {
                                if let Some(mut child) = process.take() {
                                    println!("🛑 Stopping Express server...");
                                    let _ = child.kill();
                                    let _ = child.wait();
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}