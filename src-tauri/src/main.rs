// Show console window for debugging in debug builds, hide in release
#![cfg_attr(all(not(debug_assertions), not(feature = "debug-console")), windows_subsystem = "windows")]

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
            
            // Build the app first with detailed logging
            println!("Starting Next.js build process...");
            let build_result = Command::new("npm")
                .args(&["run", "build"])
                .current_dir(&dir)
                .stdout(Stdio::inherit())  // Show build output in console
                .stderr(Stdio::inherit())  // Show build errors in console
                .status();
                
            match build_result {
                Ok(status) if status.success() => {
                    println!("✅ Build completed successfully");
                },
                Ok(status) => {
                    eprintln!("❌ Build failed with status: {}", status);
                    eprintln!("Try running 'npm run build' manually to see detailed errors");
                    return;
                },
                Err(e) => {
                    eprintln!("❌ Failed to run build command: {}", e);
                    eprintln!("Make sure npm is installed and available in PATH");
                    return;
                }
            }
            
            // Start the server with explicit host binding for Windows compatibility
            println!("Starting Next.js server on 0.0.0.0:3000...");
            match Command::new("npm")
                .args(&["run", "start"])
                .current_dir(&dir)
                .env("HOSTNAME", "0.0.0.0")  // Bind to all interfaces for Windows webview compatibility
                .stdout(Stdio::inherit())  // Show server output in console
                .stderr(Stdio::inherit())  // Show server errors in console
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
    println!("🔍 Looking for project directory...");
    
    // Start from the binary location
    if let Ok(exe_path) = env::current_exe() {
        println!("📁 Binary location: {:?}", exe_path);
        let mut dir = exe_path.parent()?.to_path_buf();
        
        // Look up the directory tree for package.json (max 10 levels)
        for level in 0..10 {
            let package_json = dir.join("package.json");
            println!("   Checking level {}: {:?}", level, package_json);
            if package_json.exists() {
                println!("✅ Found package.json at: {:?}", dir);
                return Some(dir);
            }
            if !dir.pop() {
                println!("   Reached filesystem root, stopping search");
                break;
            }
        }
    }
    
    // Fallback: try current working directory
    if let Ok(current_dir) = env::current_dir() {
        println!("📁 Trying current working directory: {:?}", current_dir);
        let package_json = current_dir.join("package.json");
        if package_json.exists() {
            println!("✅ Found package.json in current directory");
            return Some(current_dir);
        }
    }
    
    println!("❌ Could not find package.json in any searched location");
    None
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|_app| {
            println!("🚀 Tauri application starting...");
            
            // Only start Next.js server in production mode
            #[cfg(not(debug_assertions))]
            {
                println!("🔧 Production mode detected - starting Next.js server");
                match start_nextjs_server() {
                    Ok(msg) => println!("✅ {}", msg),
                    Err(e) => eprintln!("❌ Failed to start Next.js server: {}", e),
                }
            }
            
            // In debug mode, just continue without server startup
            #[cfg(debug_assertions)]
            {
                println!("🔧 Debug mode detected - expecting Next.js on localhost:3000");
                println!("Run 'npm run dev' manually in a separate terminal");
            }
            
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