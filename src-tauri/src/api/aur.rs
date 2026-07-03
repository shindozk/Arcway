use crate::errors::AppError;
use crate::models::{Package, PackageSource};
use serde::Deserialize;

const BASE_URL: &str = "https://aur.archlinux.org/rpc/v5";

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct AurPackage {
    #[serde(default)]
    pub Name: String,
    #[serde(default)]
    pub Version: String,
    #[serde(default)]
    pub Description: String,
    #[serde(default)]
    pub URL: Option<String>,
    #[serde(default)]
    pub License: Option<String>,
    #[serde(default)]
    pub NumVotes: Option<u64>,
    #[serde(default)]
    pub Popularity: Option<f64>,
    #[serde(default)]
    pub Keywords: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct AurSearchResponse {
    #[serde(default)]
    #[allow(dead_code)]
    resultcount: usize,
    #[serde(default)]
    results: Vec<AurPackage>,
    #[serde(rename = "type")]
    #[serde(default)]
    _type: String,
}

fn pkg_to_package(aur: &AurPackage) -> Package {
    let mut tags = vec!["aur".to_string()];

    if let Some(keywords) = &aur.Keywords {
        tags.extend(keywords.iter().cloned());
    }

    Package {
        id: format!("yay/aur/{}", aur.Name),
        name: aur.Name.clone(),
        description: aur.Description.clone(),
        source: PackageSource::Yay,
        version: aur.Version.clone(),
        installed_version: None,
        size: None,
        icon_url: None,
        screenshot_url: None,
        homepage: aur.URL.clone(),
        license: aur.License.clone(),
        tags,
    }
}

pub async fn search(query: &str) -> Result<Vec<Package>, AppError> {
    let client = reqwest::Client::new();
    let url = format!("{}/search/{}", BASE_URL, query);

    let resp = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| AppError::CommandFailed(format!("AUR request failed: {}", e)))?;

    let data: AurSearchResponse = resp
        .json()
        .await
        .map_err(|e| AppError::ParseError(format!("Failed to parse AUR response: {}", e)))?;

    let packages: Vec<Package> = data.results.iter().map(pkg_to_package).collect();
    Ok(packages)
}
