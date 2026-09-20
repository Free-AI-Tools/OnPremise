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
            if let Ok(shell) = app.shell().sidecar("backend") {
                if let Ok((_rx, child)) = shell.spawn() {
                    #[cfg(windows)]
                    setup_job_object(child.pid());
                    println!("[Tauri Rust] Spawned backend sidecar PID {}", child.pid());
                }
            }

            // Spawn llama-server sidecar if binary exists
            if let Ok(shell) = app.shell().sidecar("llama-server") {
                if let Ok((_rx, child)) = shell.args([
                    "-m", "models/Qwen2.5-3B-Instruct-Q4_K_M.gguf",
                    "-c", "4096",
                    "--port", "8080",
                    "--jinja"
                ]).spawn() {
                    #[cfg(windows)]
                    setup_job_object(child.pid());
                    println!("[Tauri Rust] Spawned llama-server sidecar PID {}", child.pid());
                }
            }

            // Health polling task for window transition
            tauri::async_runtime::spawn(async move {
                let client = reqwest::Client::builder()
                    .timeout(Duration::from_secs(2))
                    .build()
                    .unwrap();

                let health_url = "http://127.0.0.1:8000/health";
                let mut healthy = false;

                for _ in 0..60 { // Poll for up to 30 seconds
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
                    if let Some(splash) = app_handle.get_webview_window("splashscreen") {
                        let _ = splash.close();
                    }
                    if let Some(main) = app_handle.get_webview_window("main") {
                        let _ = main.show();
                        let _ = main.set_focus();
                    }
                } else {
                    eprintln!("[Tauri Rust] Timed out waiting for backend health check.");
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
