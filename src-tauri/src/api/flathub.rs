use crate::errors::AppError;
use crate::models::{Package, PackageSource};
use serde::Deserialize;
use serde_json::json;

const BASE_URL: &str = "https://flathub.org/api/v2";

/// Deserialize helper: treat JSON null as an empty string.
fn null_or_empty_string<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(Option::deserialize(deserializer)?.unwrap_or_default())
}

/// Deserialize helper: treat JSON null as an empty Vec.
fn null_or_empty_vec<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(Option::deserialize(deserializer)?.unwrap_or_default())
}

#[derive(Debug, Deserialize)]
pub struct FlathubHit {
    #[serde(default, deserialize_with = "null_or_empty_string")]
    pub name: String,
    #[serde(default, deserialize_with = "null_or_empty_string")]
    pub app_id: String,
    #[serde(default, deserialize_with = "null_or_empty_string")]
    pub summary: String,
    #[serde(default, deserialize_with = "null_or_empty_string")]
    pub description: String,
    #[serde(default, deserialize_with = "null_or_empty_string")]
    pub icon: String,
    #[serde(default, deserialize_with = "null_or_empty_string")]
    pub main_categories: String,
    #[serde(default, deserialize_with = "null_or_empty_vec")]
    pub sub_categories: Vec<String>,
    #[serde(default)]
    pub project_license: Option<String>,
    #[serde(default, deserialize_with = "null_or_empty_vec")]
    pub keywords: Vec<String>,
}

fn icon_url(raw: &str) -> Option<String> {
    if raw.is_empty() {
        None
    } else if raw.starts_with("http") {
        Some(raw.to_string())
    } else {
        Some(format!("https://dl.flathub.org{}", raw))
    }
}

fn hit_to_package(hit: &FlathubHit) -> Package {
    let mut tags: Vec<String> = if hit.main_categories.is_empty() {
        vec![]
    } else {
        vec![hit.main_categories.clone()]
    };
    tags.extend(hit.sub_categories.clone());
    tags.push("flatpak".to_string());

    let desc = if hit.summary.is_empty() {
        hit.description.clone()
    } else {
        hit.summary.clone()
    };

    Package {
        id: format!("flatpak/{}", hit.app_id),
        name: hit.name.clone(),
        description: desc,
        source: PackageSource::Flatpak,
        version: String::new(),
        installed_version: None,
        size: None,
        icon_url: icon_url(&hit.icon),
        screenshot_url: None,
        homepage: None,
        license: hit.project_license.clone(),
        tags,
    }
}

fn new_client(secs: u64) -> Result<reqwest::Client, AppError> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(secs))
        .build()
        .map_err(|e| AppError::CommandFailed(format!("HTTP client error: {}", e)))
}

/// Fetch the popular/featured collection for the home page.
async fn fetch_popular() -> Result<Vec<FlathubHit>, AppError> {
    let client = new_client(10)?;

    let resp = client
        .get(format!("{}/collection/popular", BASE_URL))
        .send()
        .await
        .map_err(|e| AppError::CommandFailed(format!("Flathub request failed: {}", e)))?;

    let text = resp
        .text()
        .await
        .map_err(|e| AppError::CommandFailed(format!("Flathub read failed: {}", e)))?;

    let raw: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| AppError::ParseError(format!("Flathub parse error: {}", e)))?;

    let hits_value = raw
        .get("hits")
        .and_then(|v| v.as_array())
        .ok_or_else(|| AppError::ParseError("Missing 'hits' array".to_string()))?;

    let hits: Vec<FlathubHit> = hits_value
        .iter()
        .filter_map(|v| serde_json::from_value(v.clone()).ok())
        .collect();

    Ok(hits)
}

/// Fetch screenshots in parallel for a batch of app IDs.
async fn fetch_screenshots_batch(
    client: &reqwest::Client,
    ids: &[String],
) -> Vec<(String, Option<String>)> {
    let futures: Vec<_> = ids
        .iter()
        .map(|id| {
            let url = format!("{}/appstream/{}", BASE_URL, id);
            let client = client.clone();
            let id = id.clone();
            async move {
                let screenshot = match client
                    .get(&url)
                    .timeout(std::time::Duration::from_secs(4))
                    .send()
                    .await
                {
                    Ok(resp) => match resp.text().await {
                        Ok(text) => {
                            let detail: Option<serde_json::Value> =
                                serde_json::from_str(&text).ok();
                            detail.and_then(|d| {
                                d.get("screenshots")?
                                    .as_array()?
                                    .first()?
                                    .get("sizes")?
                                    .as_array()?
                                    .iter()
                                    .filter_map(|s| {
                                        s.get("src")
                                            .and_then(|v| v.as_str())
                                            .map(String::from)
                                    })
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

    futures::future::join_all(futures).await
}

/// Get featured apps WITH screenshots — fetches everything in parallel.
pub async fn fetch_featured(limit: usize) -> Result<Vec<Package>, AppError> {
    let hits = fetch_popular().await?;
    let mut packages: Vec<Package> = hits.iter().take(limit).map(hit_to_package).collect();

    let client = new_client(8)?;

    let flatpak_ids: Vec<String> = packages
        .iter()
        .filter(|p| p.source == PackageSource::Flatpak)
        .map(|p| p.id.strip_prefix("flatpak/").unwrap_or(&p.id).to_string())
        .collect();

    let screenshots = fetch_screenshots_batch(&client, &flatpak_ids).await;
    let ss_map: std::collections::HashMap<String, Option<String>> =
        screenshots.into_iter().collect();

    for pkg in &mut packages {
        let app_id = pkg.id.strip_prefix("flatpak/").unwrap_or(&pkg.id);
        if let Some(ss) = ss_map.get(app_id) {
            pkg.screenshot_url = ss.clone();
        }
    }

    let with_ss = packages.iter().filter(|p| p.screenshot_url.is_some()).count();
    log::info!(
        "Featured: {} apps, {} with screenshots",
        packages.len(),
        with_ss
    );

    Ok(packages)
}

/// Search Flathub using the proper POST /search endpoint.
/// Falls back to filtering the popular collection if the search API fails.
pub async fn search(query: &str) -> Result<Vec<Package>, AppError> {
    // Try the proper Flathub search API (POST with JSON body)
    match search_api(query).await {
        Ok(packages) if !packages.is_empty() => return Ok(packages),
        Ok(_) => {
            log::warn!("Flathub search API returned no results for '{}', trying fallback", query);
        }
        Err(e) => {
            log::warn!("Flathub search API failed: {}, trying fallback", e);
        }
    }

    // Fallback: filter the popular collection
    search_fallback(query).await
}

/// POST to the Flathub v2 search API.
async fn search_api(query: &str) -> Result<Vec<Package>, AppError> {
    let client = new_client(10)?;

    let resp = client
        .post(format!("{}/search", BASE_URL))
        .header("Content-Type", "application/json")
        .json(&json!({ "query": query }))
        .send()
        .await
        .map_err(|e| AppError::CommandFailed(format!("Flathub search request failed: {}", e)))?;

    let text = resp
        .text()
        .await
        .map_err(|e| AppError::CommandFailed(format!("Flathub search read failed: {}", e)))?;

    let data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| AppError::ParseError(format!("Flathub search parse error: {}", e)))?;

    // Response may be { "hits": [...] } or a flat array
    let hits_array = data
        .as_array()
        .or_else(|| data.get("hits").and_then(|v| v.as_array()));

    let hits = match hits_array {
        Some(arr) => arr
            .iter()
            .filter_map(|v| serde_json::from_value::<FlathubHit>(v.clone()).ok())
            .take(50)
            .collect::<Vec<_>>(),
        None => {
            return Err(AppError::ParseError(
                "Unexpected Flathub search response format".to_string(),
            ));
        }
    };

    let mut packages: Vec<Package> = hits.iter().map(hit_to_package).collect();

    let q = query.to_lowercase();
    packages.sort_by(|a, b| {
        let a_exact = a.name.to_lowercase() == q;
        let b_exact = b.name.to_lowercase() == q;
        b_exact
            .cmp(&a_exact)
            .then_with(|| a.name.cmp(&b.name))
    });

    log::info!(
        "Flathub search '{}' => {} results",
        query,
        packages.len()
    );
    Ok(packages)
}

/// Fallback: filter the popular collection client-side.
async fn search_fallback(query: &str) -> Result<Vec<Package>, AppError> {
    let hits = fetch_popular().await?;
    let q = query.to_lowercase();

    let mut matched: Vec<Package> = hits
        .iter()
        .filter(|h| {
            h.name.to_lowercase().contains(&q)
                || h.app_id.to_lowercase().contains(&q)
                || h.summary.to_lowercase().contains(&q)
                || h.description.to_lowercase().contains(&q)
                || h.keywords.iter().any(|k| k.to_lowercase().contains(&q))
        })
        .map(hit_to_package)
        .collect();

    matched.sort_by(|a, b| {
        let a_exact = a.name.to_lowercase() == q;
        let b_exact = b.name.to_lowercase() == q;
        b_exact
            .cmp(&a_exact)
            .then_with(|| a.name.cmp(&b.name))
    });

    matched.truncate(50);
    Ok(matched)
}

pub async fn fetch_app_detail(app_id: &str) -> Result<serde_json::Value, AppError> {
    let client = new_client(10)?;

    let resp = client
        .get(format!("{}/appstream/{}", BASE_URL, app_id))
        .send()
        .await
        .map_err(|e| AppError::CommandFailed(format!("Flathub detail request failed: {}", e)))?;

    let text = resp
        .text()
        .await
        .map_err(|e| AppError::CommandFailed(format!("Flathub detail read failed: {}", e)))?;

    let data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| AppError::ParseError(format!("Flathub detail parse error: {}", e)))?;

    Ok(data)
}

/// Generic collection fetcher for any Flathub collection endpoint.
/// Fetches screenshots in parallel for all packages.
async fn fetch_collection(collection: &str, limit: usize) -> Result<Vec<Package>, AppError> {
    let client = new_client(10)?;

    let resp = client
        .get(format!("{}/collection/{}", BASE_URL, collection))
        .send()
        .await
        .map_err(|e| AppError::CommandFailed(format!("Flathub {} request failed: {}", collection, e)))?;

    let text = resp
        .text()
        .await
        .map_err(|e| AppError::CommandFailed(format!("Flathub {} read failed: {}", collection, e)))?;

    let raw: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| AppError::ParseError(format!("Flathub {} parse error: {}", collection, e)))?;

    let hits_value = raw
        .get("hits")
        .and_then(|v| v.as_array())
        .ok_or_else(|| AppError::ParseError(format!("Missing 'hits' array in {} collection", collection)))?;

    let hits: Vec<FlathubHit> = hits_value
        .iter()
        .filter_map(|v| serde_json::from_value(v.clone()).ok())
        .take(limit)
        .collect();

    let mut packages: Vec<Package> = hits.iter().map(hit_to_package).collect();

    // Fetch screenshots in parallel
    let client2 = new_client(8)?;
    let flatpak_ids: Vec<String> = packages
        .iter()
        .filter(|p| p.source == PackageSource::Flatpak)
        .map(|p| p.id.strip_prefix("flatpak/").unwrap_or(&p.id).to_string())
        .collect();

    let screenshots = fetch_screenshots_batch(&client2, &flatpak_ids).await;
    let ss_map: std::collections::HashMap<String, Option<String>> =
        screenshots.into_iter().collect();

    for pkg in &mut packages {
        let app_id = pkg.id.strip_prefix("flatpak/").unwrap_or(&pkg.id);
        if let Some(ss) = ss_map.get(app_id) {
            pkg.screenshot_url = ss.clone();
        }
    }

    log::info!("Collection '{}': {} apps", collection, packages.len());
    Ok(packages)
}

/// Fetch trending apps.
pub async fn fetch_trending(limit: usize) -> Result<Vec<Package>, AppError> {
    fetch_collection("trending", limit).await
}

/// Fetch recently updated apps.
pub async fn fetch_recently_updated(limit: usize) -> Result<Vec<Package>, AppError> {
    fetch_collection("recently-updated", limit).await
}

/// Fetch recently added (new) apps.
pub async fn fetch_recently_added(limit: usize) -> Result<Vec<Package>, AppError> {
    fetch_collection("recently-added", limit).await
}

/// Fetch apps by category.
pub async fn fetch_by_category(category: &str, limit: usize) -> Result<Vec<Package>, AppError> {
    fetch_collection(&format!("category/{}", category), limit).await
}
