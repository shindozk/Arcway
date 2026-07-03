use crate::api;
use crate::cache::Cache;
use crate::errors::AppError;
use crate::models::*;
use crate::package_managers::MultiManager;
use tauri::State;

fn score_relevance(pkg: &Package, query: &str) -> u32 {
    let q = query.to_lowercase();
    let name_lower = pkg.name.to_lowercase();
    let id_lower = pkg.id.to_lowercase();

    if name_lower == q {
        100
    } else if name_lower.starts_with(&q) {
        80
    } else if name_lower.contains(&q) {
        60
    } else if id_lower.contains(&q) {
        40
    } else if pkg.description.to_lowercase().contains(&q) {
        20
    } else if pkg.tags.iter().any(|t| t.to_lowercase().contains(&q)) {
        10
    } else {
        0
    }
}

#[tauri::command]
pub async fn search_packages(
    query: String,
    sources: Option<Vec<PackageSource>>,
    _manager: State<'_, MultiManager>,
) -> Result<Vec<Package>, AppError> {
    let mut all_packages = Vec::new();

    let flathub_future = api::flathub::search(&query);
    let aur_future = api::aur::search(&query);

    let (flathub_result, aur_result) = tokio::join!(flathub_future, aur_future);

    match flathub_result {
        Ok(packages) => all_packages.extend(packages),
        Err(e) => {
            log::warn!("Flathub search failed: {}", e);
        }
    }

    match aur_result {
        Ok(packages) => all_packages.extend(packages),
        Err(e) => {
            log::warn!("AUR search failed: {}", e);
        }
    }

    if let Some(source_list) = sources {
        all_packages.retain(|pkg| source_list.contains(&pkg.source));
    }

    // Deduplicate by name+source, keep first occurrence
    let mut seen = std::collections::HashSet::new();
    all_packages.retain(|pkg| {
        let key = format!("{}:{:?}", pkg.name, pkg.source);
        seen.insert(key)
    });

    // Sort by relevance score descending, then alphabetically
    let query_str = query.clone();
    all_packages.sort_by(|a, b| {
        let sa = score_relevance(a, &query_str);
        let sb = score_relevance(b, &query_str);
        sb.cmp(&sa).then_with(|| a.name.cmp(&b.name))
    });

    Ok(all_packages)
}

#[tauri::command]
pub async fn get_featured_packages(
    limit: Option<usize>,
) -> Result<Vec<Package>, AppError> {
    let limit = limit.unwrap_or(20);
    api::flathub::fetch_featured(limit).await
}

#[tauri::command]
pub async fn get_screenshots(
    app_ids: Vec<String>,
) -> Result<Vec<(String, Option<String>)>, AppError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| AppError::CommandFailed(format!("HTTP client error: {}", e)))?;

    let futures: Vec<_> = app_ids
        .iter()
        .map(|id| {
            let url = format!("https://flathub.org/api/v2/appstream/{}", id);
            let client = client.clone();
            let id = id.clone();
            async move {
                let screenshot = match client.get(&url).timeout(std::time::Duration::from_secs(4)).send().await {
                    Ok(resp) => match resp.text().await {
                        Ok(text) => {
                            let detail: Option<serde_json::Value> = serde_json::from_str(&text).ok();
                            detail.and_then(|d| {
                                d.get("screenshots")?
                                    .as_array()?
                                    .first()?
                                    .get("sizes")?
                                    .as_array()?
                                    .iter()
                                    .filter_map(|s| s.get("src").and_then(|v| v.as_str()).map(String::from))
                                    .max_by_key(|s| s.len())
                            })
                        }
                        Err(_) => None,
                    },
                    Err(_) => None,
                };
                (id, screenshot)
            }
        })
        .collect();

    Ok(futures::future::join_all(futures).await)
}

#[tauri::command]
pub async fn get_package_detail(
    id: String,
    source: PackageSource,
    manager: State<'_, MultiManager>,
) -> Result<Option<Package>, AppError> {
    let name = id.split('/').last().unwrap_or(&id);
    let packages = manager.search_in_sources(name, &[source]).await?;
    Ok(packages.into_iter().find(|p| p.id == id || p.name == name))
}

#[tauri::command]
pub async fn list_installed(
    manager: State<'_, MultiManager>,
    cache: State<'_, Cache>,
) -> Result<Vec<InstalledPackage>, AppError> {
    let installed = manager.list_all_installed().await?;
    if let Err(e) = cache.save_installed(&installed) {
        log::warn!("Failed to update installed cache: {}", e);
    }
    Ok(installed)
}

#[tauri::command]
pub async fn get_flathub_detail(app_id: String) -> Result<serde_json::Value, AppError> {
    api::flathub::fetch_app_detail(&app_id).await
}

#[tauri::command]
pub async fn get_trending_packages(
    limit: Option<usize>,
) -> Result<Vec<Package>, AppError> {
    let limit = limit.unwrap_or(30);
    api::flathub::fetch_trending(limit).await
}

#[tauri::command]
pub async fn get_recently_updated_packages(
    limit: Option<usize>,
) -> Result<Vec<Package>, AppError> {
    let limit = limit.unwrap_or(30);
    api::flathub::fetch_recently_updated(limit).await
}

#[tauri::command]
pub async fn get_recently_added_packages(
    limit: Option<usize>,
) -> Result<Vec<Package>, AppError> {
    let limit = limit.unwrap_or(30);
    api::flathub::fetch_recently_added(limit).await
}

#[tauri::command]
pub async fn get_category_packages(
    category: String,
    limit: Option<usize>,
) -> Result<Vec<Package>, AppError> {
    let limit = limit.unwrap_or(30);
    api::flathub::fetch_by_category(&category, limit).await
}

#[tauri::command]
pub async fn list_arcway_installed(
    cache: State<'_, Cache>,
) -> Result<Vec<Package>, AppError> {
    let packages = cache.get_arcway_installed_packages()?;
    log::info!("list_arcway_installed => {} packages", packages.len());
    Ok(packages)
}
