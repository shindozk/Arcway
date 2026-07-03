use crate::cache::Cache;
use crate::errors::AppError;
use crate::models::*;
use crate::package_managers::MultiManager;
use tauri::{Emitter, State, Window};
use tokio::sync::mpsc;

#[tauri::command]
pub async fn check_updates(
    manager: State<'_, MultiManager>,
) -> Result<Vec<UpdateInfo>, AppError> {
    manager.check_all_updates().await
}

#[tauri::command]
pub async fn check_arcway_updates(
    manager: State<'_, MultiManager>,
    cache: State<'_, Cache>,
) -> Result<Vec<UpdateInfo>, AppError> {
    let installed = cache.get_arcway_installed_packages()?;
    let installed_ids: std::collections::HashSet<String> = installed
        .iter()
        .map(|p| p.id.clone())
        .collect();

    // Also collect just the package names for matching
    let installed_names: std::collections::HashSet<String> = installed
        .iter()
        .map(|p| p.name.clone())
        .collect();

    log::info!("check_arcway_updates: {} Arcway packages installed", installed_ids.len());

    let all_updates = manager.check_all_updates().await?;

    let arcway_updates: Vec<UpdateInfo> = all_updates
        .into_iter()
        .filter(|u| {
            // Match by full package_id (e.g. "flatpak/org.mozilla.firefox")
            if installed_ids.contains(&u.package_id) {
                return true;
            }
            // Match by name (e.g. "firefox" matches "yay/firefox" in installed)
            if installed_names.contains(&u.name) {
                return true;
            }
            // Match by source/name format
            let source_name = format!("{}/{}", u.source, u.name);
            if installed_ids.contains(&source_name) {
                return true;
            }
            false
        })
        .collect();

    log::info!("check_arcway_updates => {} updates", arcway_updates.len());
    Ok(arcway_updates)
}

#[tauri::command]
pub async fn update_package(
    id: String,
    manager: State<'_, MultiManager>,
    window: Window,
) -> Result<(), AppError> {
    let source = if id.starts_with("flatpak/") {
        PackageSource::Flatpak
    } else if id.starts_with("yay/") {
        PackageSource::Yay
    } else if id.starts_with("paru/") {
        PackageSource::Paru
    } else {
        return Err(AppError::ParseError(format!(
            "Cannot determine source for package: {}",
            id
        )));
    };

    let (tx, mut rx) = mpsc::unbounded_channel::<ProgressEvent>();

    let window_clone = window.clone();
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            let _ = window_clone.emit("update-progress", &event);
        }
    });

    let result = manager.install_package(&id, &source, tx).await;

    if result.is_ok() {
        let _ = window.emit("package-updated", &id);
    }

    result
}

#[tauri::command]
pub async fn update_all(
    manager: State<'_, MultiManager>,
    cache: State<'_, Cache>,
    window: Window,
) -> Result<Vec<String>, AppError> {
    // Only update Arcway-installed packages
    let installed = cache.get_arcway_installed_packages()?;
    let installed_ids: std::collections::HashSet<String> = installed
        .iter()
        .map(|p| p.id.clone())
        .collect();
    let installed_names: std::collections::HashSet<String> = installed
        .iter()
        .map(|p| p.name.clone())
        .collect();

    let all_updates = manager.check_all_updates().await?;

    let arcway_updates: Vec<UpdateInfo> = all_updates
        .into_iter()
        .filter(|u| {
            installed_ids.contains(&u.package_id)
                || installed_names.contains(&u.name)
                || installed_ids.contains(&format!("{}/{}", u.source, u.name))
        })
        .collect();

    if arcway_updates.is_empty() {
        return Ok(Vec::new());
    }

    let mut updated = Vec::new();
    let mut errors = Vec::new();

    let (tx, mut rx) = mpsc::unbounded_channel::<ProgressEvent>();

    let window_clone = window.clone();
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            let _ = window_clone.emit("update-progress", &event);
        }
    });

    for update in &arcway_updates {
        let _ = window.emit("update-status", format!("Updating {}...", update.name));

        match manager.install_package(&update.package_id, &update.source, tx.clone()).await {
            Ok(()) => {
                updated.push(update.name.clone());
                let _ = window.emit("package-updated", &update.package_id);
            }
            Err(e) => {
                errors.push(format!("{}: {}", update.name, e));
                log::error!("Failed to update {}: {}", update.name, e);
            }
        }
    }

    if !errors.is_empty() {
        log::warn!("Some updates failed: {}", errors.join(", "));
    }

    Ok(updated)
}
