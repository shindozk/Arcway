use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum PackageSource {
    Flatpak,
    Yay,
    Paru,
}

impl fmt::Display for PackageSource {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PackageSource::Flatpak => write!(f, "flatpak"),
            PackageSource::Yay => write!(f, "yay"),
            PackageSource::Paru => write!(f, "paru"),
        }
    }
}

impl PackageSource {
    pub fn all() -> Vec<PackageSource> {
        vec![PackageSource::Flatpak, PackageSource::Yay, PackageSource::Paru]
    }
}

impl From<&str> for PackageSource {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "flatpak" => PackageSource::Flatpak,
            "yay" => PackageSource::Yay,
            "paru" => PackageSource::Paru,
            _ => PackageSource::Flatpak,
        }
    }
}
