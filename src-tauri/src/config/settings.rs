use crate::cache::Cache;
use crate::errors::AppError;
use crate::models::PackageSource;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Settings {
    pub theme_seed_color: String,
    pub dark_mode: bool,
    pub enabled_sources: Vec<PackageSource>,
    pub cache_duration_minutes: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            theme_seed_color: "#6750A4".to_string(),
            dark_mode: true,
            enabled_sources: PackageSource::all(),
            cache_duration_minutes: 30,
        }
    }
}

impl Settings {
    pub fn load(cache: &Cache) -> Result<Self, AppError> {
        let config_json = cache.get_config("settings")?;

        match config_json {
            Some(json) => {
                let settings: Settings =
                    serde_json::from_str(&json).map_err(AppError::Json)?;
                Ok(settings)
            }
            None => Ok(Settings::default()),
        }
    }

    pub fn save(&self, cache: &Cache) -> Result<(), AppError> {
        let json =
            serde_json::to_string(self).map_err(AppError::Json)?;
        cache.save_config("settings", &json)?;
        Ok(())
    }
}
