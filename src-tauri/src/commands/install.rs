use crate::cache::Cache;
use crate::errors::AppError;
use crate::models::*;
use crate::package_managers::MultiManager;
use tauri::{Emitter, State, Window};
use tokio::sync::mpsc;

#[tauri::command]
pub async fn install_package(
    id: String,
    source: PackageSource,
    manager: State<'_, MultiManager>,
    cache: State<'_, Cache>,
    window: Window,
) -> Result<(), AppError> {
    let (tx, mut rx) = mpsc::unbounded_channel::<ProgressEvent>();

    let window_clone = window.clone();
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            let _ = window_clone.emit("install-progress", &event);
        }
    });

    let result = manager.install_package(&id, &source, tx).await;

    if result.is_ok() {
        let pkg_name = id.split('/').last().unwrap_or(&id);
        let _ = cache.mark_installed(pkg_name, &source, "installed");

        let _ = window.emit("package-installed", &id);
    }

    result
}

#[tauri::command]
pub async fn uninstall_package(
    id: String,
    source: PackageSource,
    manager: State<'_, MultiManager>,
    cache: State<'_, Cache>,
    window: Window,
) -> Result<(), AppError> {
    let (tx, mut rx) = mpsc::unbounded_channel::<ProgressEvent>();

    let window_clone = window.clone();
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            let _ = window_clone.emit("uninstall-progress", &event);
        }
    });

    let result = manager.uninstall_package(&id, &source, tx).await;

    if result.is_ok() {
        let pkg_name = id.split('/').last().unwrap_or(&id);
        let _ = cache.mark_uninstalled(pkg_name, &source);

        let _ = window.emit("package-uninstalled", &id);
    }

    result
}
