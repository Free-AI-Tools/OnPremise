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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Spawn sidecars in release / binary mode if sidecars exist
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

            // Detect system RAM and choose context window size
            let total_ram_gb = {
                use sysinfo::System;
                let mut sys = System::new();
                sys.refresh_memory();
                (sys.total_memory() as f64) / 1_073_741_824.0 // bytes → GB
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
            println!("[Tauri Rust] Detected {:.1} GB RAM → using -c {}", total_ram_gb, ctx_size);

            // Resolve model path dynamically from resource_dir or fallback paths
            let model_path = app
                .path()
                .resource_dir()
                .map(|p| p.join("models").join("Qwen2.5-3B-Instruct-Q4_K_M.gguf"))
                .unwrap_or_else(|_| std::path::PathBuf::from("models/Qwen2.5-3B-Instruct-Q4_K_M.gguf"));

            let model_arg = if model_path.exists() {
                model_path.to_string_lossy().to_string()
            } else if std::path::Path::new("models/Qwen2.5-3B-Instruct-Q4_K_M.gguf").exists() {
                "models/Qwen2.5-3B-Instruct-Q4_K_M.gguf".to_string()
            } else if std::path::Path::new("src-tauri/models/Qwen2.5-3B-Instruct-Q4_K_M.gguf").exists() {
                "src-tauri/models/Qwen2.5-3B-Instruct-Q4_K_M.gguf".to_string()
            } else {
                "models/Qwen2.5-3B-Instruct-Q4_K_M.gguf".to_string()
            };

            // Spawn llama-server sidecar with adaptive context window
            match app.shell().sidecar("llama-server") {
                Ok(cmd) => match cmd.args([
                    "-m", &model_arg,
                    "-c", ctx_size,
                    "--port", "8080",
                    "--jinja"
                ]).spawn() {
                    Ok((mut rx, child)) => {
                        #[cfg(windows)]
                        setup_job_object(child.pid());
                        println!("[Tauri Rust] Spawned llama-server sidecar PID {} with ctx={} model={}", child.pid(), ctx_size, model_arg);
                        tauri::async_runtime::spawn(async move {
                            while let Some(event) = rx.recv().await {
                                match event {
                                    tauri_plugin_shell::process::CommandEvent::Stderr(b) => {
                                        eprintln!("[llama-server stderr] {}", String::from_utf8_lossy(&b));
                                    }
                                    tauri_plugin_shell::process::CommandEvent::Terminated(p) => {
                                        println!("[llama-server] Process terminated with code: {:?}", p.code);
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                        });
                    }
                    Err(e) => eprintln!("[Tauri Rust] Failed to spawn llama-server sidecar: {:?}", e),
                },
                Err(e) => eprintln!("[Tauri Rust] llama-server sidecar not configured or not found: {:?}", e),
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
