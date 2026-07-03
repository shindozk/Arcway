use crate::cache::Cache;
use crate::config::Settings;
use crate::errors::AppError;
use tauri::State;

#[tauri::command]
pub async fn get_settings(cache: State<'_, Cache>) -> Result<Settings, AppError> {
    Settings::load(&cache)
}

#[tauri::command]
pub async fn save_settings(
    settings: Settings,
    cache: State<'_, Cache>,
) -> Result<(), AppError> {
    settings.save(&cache)
}

#[tauri::command]
pub async fn clear_cache(cache: State<'_, Cache>) -> Result<(), AppError> {
    cache.clear()
}
