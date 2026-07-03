use serde::{Deserialize, Serialize};

use super::source::PackageSource;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Package {
    pub id: String,
    pub name: String,
    pub description: String,
    pub source: PackageSource,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installed_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub screenshot_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InstalledPackage {
    pub package_id: String,
    pub name: String,
    pub source: PackageSource,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UpdateInfo {
    pub package_id: String,
    pub name: String,
    pub source: PackageSource,
    pub current_version: String,
    pub new_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProgressEvent {
    pub package_id: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percentage: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SearchResult {
    pub packages: Vec<Package>,
    pub total_count: usize,
    pub source: PackageSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Comment {
    pub id: i64,
    pub package_id: String,
    pub author: String,
    pub content: String,
    pub created_at: String,
}
