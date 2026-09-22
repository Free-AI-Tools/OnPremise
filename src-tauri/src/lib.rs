use std::time::Duration;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

#[cfg(windows)]
use winapi::um::jobapi2::{AssignProcessToJobObject, CreateJobObjectW, SetInformationJobObject};
#[cfg(windows)]
use winapi::um::winnt::{
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
};

#[cfg(windows)]
fn setup_job_object(child_pid: u32) {
    unsafe {
        let job = CreateJobObjectW(std::ptr::null_mut(), std::ptr::null());
        if !job.is_null() {
            let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            SetInformationJobObject(
                job,
                8, // JobObjectExtendedLimitInformation
                &mut info as *mut _ as *mut _,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            );
            let process_handle = winapi::um::processthreadsapi::OpenProcess(
                winapi::um::winnt::PROCESS_SET_QUOTA | winapi::um::winnt::PROCESS_TERMINATE,
                0,
                child_pid,
            );
            if !process_handle.is_null() {
                AssignProcessToJobObject(job, process_handle);
                winapi::um::handleapi::CloseHandle(process_handle);
            }
        }
    }
}

fn find_model_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    // 1. Check data_location.txt pointer
    if let Ok(ptr_content) = std::fs::read_to_string("data_location.txt") {
        let p = std::path::PathBuf::from(ptr_content.trim()).join("models").join("Qwen2.5-3B-Instruct-Q4_K_M.gguf");
        if p.exists() { return Some(p); }
    }
    // 2. Check resource_dir / models
    if let Ok(res_dir) = app.path().resource_dir() {
        let p = res_dir.join("models").join("Qwen2.5-3B-Instruct-Q4_K_M.gguf");
        if p.exists() { return Some(p); }
    }
    // 3. Check app_data_dir / models
    if let Ok(app_dir) = app.path().app_data_dir() {
        let p = app_dir.join("models").join("Qwen2.5-3B-Instruct-Q4_K_M.gguf");
        if p.exists() { return Some(p); }
    }
    // 4. Check ./models/
    let local_models = std::path::PathBuf::from("models").join("Qwen2.5-3B-Instruct-Q4_K_M.gguf");
    if local_models.exists() { return Some(local_models); }

    // 5. Check backend/.config/models/
    let backend_cfg = std::path::PathBuf::from("backend/.config/models").join("Qwen2.5-3B-Instruct-Q4_K_M.gguf");
    if backend_cfg.exists() { return Some(backend_cfg); }

    // 6. Check src-tauri/models/ (dev)
    let dev_models = std::path::PathBuf::from("src-tauri/models").join("Qwen2.5-3B-Instruct-Q4_K_M.gguf");
    if dev_models.exists() { return Some(dev_models); }

    None
}

fn spawn_llama_server_with_path(app: &tauri::AppHandle, model_path: &std::path::Path) -> Result<(), String> {
    let total_ram_gb = {
        use sysinfo::System;
        let mut sys = System::new();
        sys.refresh_memory();
        (sys.total_memory() as f64) / 1_073_741_824.0
    };

    let ctx_size = if total_ram_gb <= 4.0 {
        "2048"
    } else if total_ram_gb <= 8.0 {
        "4096"
    } else if total_ram_gb <= 16.0 {
        "8192"
    } else {
        "16384"
    };

    let model_str = model_path.to_string_lossy().to_string();

    match app.shell().sidecar("llama-server") {
        Ok(cmd) => match cmd.args([
            "-m", &model_str,
            "-c", ctx_size,
            "--port", "8080",
            "--jinja"
        ]).spawn() {
            Ok((mut rx, child)) => {
                #[cfg(windows)]
                setup_job_object(child.pid());
                println!("[Tauri Rust] Spawned llama-server PID {} with model: {}", child.pid(), model_str);
                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        match event {
                            tauri_plugin_shell::process::CommandEvent::Stderr(b) => {
                                eprintln!("[llama-server stderr] {}", String::from_utf8_lossy(&b));
                            }
                            tauri_plugin_shell::process::CommandEvent::Terminated(p) => {
                                println!("[llama-server] Terminated with code: {:?}", p.code);
                                break;
                            }
                            _ => {}
                        }
                    }
                });
                Ok(())
            }
            Err(e) => Err(format!("Failed to spawn llama-server: {:?}", e)),
        },
        Err(e) => Err(format!("Sidecar llama-server not found: {:?}", e)),
    }
}

#[tauri::command]
fn start_llama_server(app: tauri::AppHandle, custom_path: Option<String>) -> Result<bool, String> {
    let model_to_use = if let Some(cp) = custom_path {
        let p = std::path::PathBuf::from(cp);
        if p.exists() {
            p
        } else {
            return Err("Specified model file does not exist".to_string());
        }
    } else {
        match find_model_path(&app) {
            Some(p) => p,
            None => return Err("No model file found".to_string()),
        }
    };

    spawn_llama_server_with_path(&app, &model_to_use)?;
    Ok(true)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![start_llama_server])
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Spawn backend sidecar in release / binary mode if sidecars exist
            match app.shell().sidecar("backend") {
                Ok(cmd) => match cmd.spawn() {
                    Ok((mut rx, child)) => {
                        #[cfg(windows)]
                        setup_job_object(child.pid());
                        println!("[Tauri Rust] Spawned backend sidecar PID {}", child.pid());
                        tauri::async_runtime::spawn(async move {
                            while let Some(event) = rx.recv().await {
                                match event {
                                    tauri_plugin_shell::process::CommandEvent::Stderr(b) => {
                                        eprintln!("[backend stderr] {}", String::from_utf8_lossy(&b));
                                    }
                                    tauri_plugin_shell::process::CommandEvent::Terminated(p) => {
                                        println!("[backend] Process terminated with code: {:?}", p.code);
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                        });
                    }
                    Err(e) => eprintln!("[Tauri Rust] Failed to spawn backend sidecar: {:?}", e),
                },
                Err(e) => eprintln!("[Tauri Rust] Backend sidecar not configured or not found: {:?}", e),
            }

            // Check if model already exists; if so, spawn llama-server right away
            if let Some(existing_model) = find_model_path(&app_handle) {
                println!("[Tauri Rust] Found existing model at {:?}. Spawning llama-server...", existing_model);
                let _ = spawn_llama_server_with_path(&app_handle, &existing_model);
            } else {
                println!("[Tauri Rust] No model found on disk. Waiting for in-app model onboarding.");
            }

            // Health polling task for window transition
            tauri::async_runtime::spawn(async move {
                let client = reqwest::Client::builder()
                    .timeout(Duration::from_secs(2))
                    .build()
                    .unwrap();

                let health_url = "http://127.0.0.1:8000/health";
                let mut healthy = false;

                for _ in 0..90 { // Poll for up to 45 seconds
                    if let Ok(res) = client.get(health_url).send().await {
                        if res.status().is_success() {
                            healthy = true;
                            break;
                        }
                    }
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }

                if healthy {
                    println!("[Tauri Rust] Backend is healthy! Transitioning from splashscreen to main window.");
                } else {
                    eprintln!("[Tauri Rust] Backend health check timed out, revealing main window anyway.");
                }

                if let Some(splash) = app_handle.get_webview_window("splashscreen") {
                    let _ = splash.close();
                }
                if let Some(main) = app_handle.get_webview_window("main") {
                    let _ = main.show();
                    let _ = main.set_focus();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
