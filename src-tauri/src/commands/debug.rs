use crate::errors::AppError;
use crate::shell::executor;
use log::{Level, Metadata, Record, SetLoggerError, LevelFilter, Log};
use once_cell::sync::OnceCell;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use serde::Serialize;
use chrono::Utc;

static APP_HANDLE: OnceCell<Mutex<Option<AppHandle>>> = OnceCell::new();
static LOG_FILE: OnceCell<Mutex<Option<String>>> = OnceCell::new();

#[derive(Debug, Clone, Serialize)]
pub struct LogEntry {
    pub level: String,
    pub message: String,
    pub timestamp: String,
    pub source: String,
}

pub struct TauriLogger;

impl Log for TauriLogger {
    fn enabled(&self, _metadata: &Metadata) -> bool {
        true
    }

    fn log(&self, record: &Record) {
        if !self.enabled(record.metadata()) { return; }

        let level = match record.level() {
            Level::Error => "ERROR",
            Level::Warn => "WARN",
            Level::Info => "INFO",
            Level::Debug => "DEBUG",
            Level::Trace => "TRACE",
        };

        let ts = Utc::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
        let msg = record.args().to_string();

        // Write to log file
        if let Some(mutex) = LOG_FILE.get() {
            if let Ok(guard) = mutex.lock() {
                if let Some(ref path) = *guard {
                    let line = format!("[{}] [{}] {}\n", ts, level, msg);
                    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
                        let _ = file.write_all(line.as_bytes());
                    }
                }
            }
        }

        // Emit to frontend debug panel
        let entry = LogEntry {
            level: level.to_string(),
            message: msg,
            timestamp: ts,
            source: "backend".to_string(),
        };

        if let Some(mutex) = APP_HANDLE.get() {
            if let Ok(guard) = mutex.lock() {
                if let Some(app) = guard.as_ref() {
                    let _ = app.emit("backend-log", &entry);
                }
            }
        }
    }

    fn flush(&self) {}
}

pub fn init_logger(app_handle: AppHandle) -> Result<(), SetLoggerError> {
    let _ = APP_HANDLE.set(Mutex::new(Some(app_handle)));

    // Create log file for this session
    let log_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("arcway")
        .join("logs");
    let _ = fs::create_dir_all(&log_dir);

    let session_id = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let log_path = log_dir.join(format!("arcway_{}.log", session_id));
    let _ = LOG_FILE.set(Mutex::new(Some(log_path.to_string_lossy().to_string())));

    log::set_boxed_logger(Box::new(TauriLogger))
        .map(|()| log::set_max_level(LevelFilter::Debug))
}

#[tauri::command]
pub fn set_sudo_password(password: String) -> bool {
    executor::set_sudo_password(password);
    log::info!("Sudo password set");
    true
}

#[tauri::command]
pub fn has_sudo_password() -> bool {
    executor::has_sudo_password()
}

#[tauri::command]
pub fn get_log_path() -> Option<String> {
    LOG_FILE.get().and_then(|m| m.lock().ok()).and_then(|p| p.clone())
}

#[tauri::command]
pub fn get_log_content() -> Result<String, AppError> {
    let path = LOG_FILE.get()
        .and_then(|m| m.lock().ok())
        .and_then(|p| p.clone())
        .ok_or_else(|| AppError::NotFound("No log file".to_string()))?;

    fs::read_to_string(&path)
        .map_err(|e| AppError::CommandFailed(format!("Failed to read log: {}", e)))
}

#[tauri::command]
pub fn list_log_files() -> Result<Vec<String>, AppError> {
    let log_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("arcway")
        .join("logs");

    if !log_dir.exists() {
        return Ok(Vec::new());
    }

    let mut files: Vec<String> = fs::read_dir(&log_dir)
        .map_err(|e| AppError::CommandFailed(e.to_string()))?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().and_then(|x| x.to_str()) == Some("log"))
        .map(|e| e.path().to_string_lossy().to_string())
        .collect();

    files.sort();
    files.reverse();

    // Keep only the 10 most recent logs
    if files.len() > 10 {
        let to_remove: Vec<String> = files[10..].to_vec();
        for path in &to_remove {
            let _ = fs::remove_file(path);
        }
        files.truncate(10);
    }

    Ok(files)
}
