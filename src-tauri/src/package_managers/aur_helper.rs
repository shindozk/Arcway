use crate::errors::AppError;
use crate::models::*;
use crate::shell::ShellExecutor;
use regex::Regex;
use tokio::sync::mpsc;

/// Configuration for an AUR helper (yay or paru).
pub struct AurHelperConfig {
    pub name: &'static str,
    pub search_args: &'static [&'static str],
    pub install_args: &'static [&'static str],
    pub uninstall_args: &'static [&'static str],
    pub list_args: &'static [&'static str],
    pub update_args: &'static [&'static str],
    pub source: PackageSource,
    pub size_units: &'static [&'static str],
}

pub const YAY_CONFIG: AurHelperConfig = AurHelperConfig {
    name: "yay",
    search_args: &["-Ss"],
    install_args: &["-S", "--noconfirm", "--needed"],
    uninstall_args: &["-R", "--noconfirm"],
    list_args: &["-Q"],
    update_args: &["-Qu"],
    source: PackageSource::Yay,
    size_units: &["b", "kb", "mb", "gb", "tb"],
};

pub const PARU_CONFIG: AurHelperConfig = AurHelperConfig {
    name: "paru",
    search_args: &["-Ss"],
    install_args: &["-S", "--noconfirm", "--needed"],
    uninstall_args: &["-R", "--noconfirm"],
    list_args: &["-Q"],
    update_args: &["-Qu"],
    source: PackageSource::Paru,
    size_units: &["b", "kib", "mib", "gib", "tib"],
};

pub struct AurHelper {
    config: &'static AurHelperConfig,
    executor: ShellExecutor,
}

impl AurHelper {
    pub fn new(config: &'static AurHelperConfig, executor: ShellExecutor) -> Self {
        AurHelper { config, executor }
    }

    pub fn name(&self) -> &str {
        self.config.name
    }

    pub async fn search(&self, query: &str) -> Result<Vec<Package>, AppError> {
        let mut args = self.config.search_args.to_vec();
        args.push(query);
        let output = self.executor.run_command(self.config.name, &args).await?;
        Ok(self.parse_search_output(&output))
    }

    pub async fn install(
        &self,
        id: &str,
        sender: mpsc::UnboundedSender<ProgressEvent>,
    ) -> Result<(), AppError> {
        if id.starts_with("flatpak/") {
            return Err(AppError::CommandFailed(format!(
                "Cannot install flatpak package via {}",
                self.config.name
            )));
        }

        let pkg_name = self.strip_prefix(id);
        let mut args = self.config.install_args.to_vec();
        args.push(pkg_name);
        self.executor
            .run_command_with_progress(self.config.name, &args, sender, id)
            .await?;
        Ok(())
    }

    pub async fn uninstall(
        &self,
        id: &str,
        sender: mpsc::UnboundedSender<ProgressEvent>,
    ) -> Result<(), AppError> {
        let pkg_name = self.strip_prefix(id);
        let mut args = self.config.uninstall_args.to_vec();
        args.push(pkg_name);
        self.executor
            .run_command_with_progress(self.config.name, &args, sender, id)
            .await?;
        Ok(())
    }

    pub async fn list_installed(&self) -> Result<Vec<InstalledPackage>, AppError> {
        let output = self
            .executor
            .run_command(self.config.name, self.config.list_args)
            .await?;
        Ok(self.parse_installed_output(&output))
    }

    pub async fn check_updates(&self) -> Result<Vec<UpdateInfo>, AppError> {
        let (_code, output) = self
            .executor
            .run_command_allow_fail(self.config.name, self.config.update_args)
            .await?;
        Ok(self.parse_update_output(&output))
    }

    fn strip_prefix<'a>(&self, id: &'a str) -> &'a str {
        let prefix = format!("{}/", self.config.name);
        let name = id.strip_prefix(&prefix).unwrap_or(id);
        name.strip_prefix("aur/").unwrap_or(name)
    }

    fn parse_search_output(&self, output: &str) -> Vec<Package> {
        let mut packages = Vec::new();
        let header_re = Regex::new(r"^([\w-]+/[\w.-]+)\s+([\d.]+(?:-\d+)?)").ok();

        for line in output.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with(":: ") {
                continue;
            }

            if let Some(re) = &header_re {
                if let Some(caps) = re.captures(line) {
                    let full_name = caps.get(1).unwrap().as_str().to_string();
                    let version = caps.get(2).unwrap().as_str().to_string();

                    let parts: Vec<&str> = full_name.splitn(2, '/').collect();
                    if parts.len() == 2 {
                        let repo = parts[0].to_string();
                        let name = parts[1].to_string();

                        packages.push(Package {
                            id: format!("{}/{}/{}", self.config.name, repo, name),
                            name,
                            description: String::new(),
                            source: self.config.source.clone(),
                            version,
                            installed_version: None,
                            size: None,
                            icon_url: None,
                            screenshot_url: None,
                            homepage: None,
                            license: None,
                            tags: vec![
                                repo,
                                self.config.name.to_string(),
                                "aur".to_string(),
                            ],
                        });
                    }
                    continue;
                }
            }

            if line.starts_with(' ') && !packages.is_empty() {
                let trimmed = line.trim_start();
                let pkg = packages.last_mut().unwrap();

                if let Some(size_str) = trimmed.strip_prefix("Installed Size:") {
                    pkg.size = self.parse_size(size_str.trim());
                } else if let Some(homepage) = trimmed.strip_prefix("Homepage:") {
                    pkg.homepage = Some(homepage.trim().to_string());
                } else if let Some(license) = trimmed.strip_prefix("License:") {
                    pkg.license = Some(license.trim().to_string());
                } else if let Some(desc) = trimmed.strip_prefix("Description:") {
                    pkg.description = desc.trim().to_string();
                }
            }
        }

        packages
    }

    fn parse_size(&self, size_str: &str) -> Option<u64> {
        let size_str = size_str.trim().to_lowercase();
        let units_pattern = self.config.size_units.join("|");
        let pattern = format!(r"([\d.]+)\s*({})", units_pattern);
        let re = Regex::new(&pattern).ok()?;

        if let Some(caps) = re.captures(&size_str) {
            let value: f64 = caps.get(1)?.as_str().parse().ok()?;
            let unit = caps.get(2)?.as_str();

            let multiplier = match unit {
                "b" => 1.0,
                "kb" | "kib" => 1024.0,
                "mb" | "mib" => 1024.0 * 1024.0,
                "gb" | "gib" => 1024.0 * 1024.0 * 1024.0,
                "tb" | "tib" => 1024.0 * 1024.0 * 1024.0 * 1024.0,
                _ => 1.0,
            };

            Some((value * multiplier) as u64)
        } else {
            None
        }
    }

    fn parse_installed_output(&self, output: &str) -> Vec<InstalledPackage> {
        let mut packages = Vec::new();
        let re = Regex::new(r"^([\w.-]+)\s+([\d.]+(?:-\d+)?)").ok();

        for line in output.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            if let Some(re) = &re {
                if let Some(caps) = re.captures(line) {
                    let name = caps.get(1).unwrap().as_str().to_string();
                    let version = caps.get(2).unwrap().as_str().to_string();

                    packages.push(InstalledPackage {
                        package_id: format!("{}/{}", self.config.name, name),
                        name,
                        source: self.config.source.clone(),
                        version,
                        size: None,
                    });
                }
            }
        }

        packages
    }

    fn parse_update_output(&self, output: &str) -> Vec<UpdateInfo> {
        let mut updates = Vec::new();
        let re =
            Regex::new(r"^([\w.-]+)\s+([\d.]+(?:-\d+)?)\s+->\s+([\d.]+(?:-\d+)?)").ok();

        for line in output.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with(":: ") || line.starts_with("->") {
                continue;
            }

            if let Some(re) = &re {
                if let Some(caps) = re.captures(line) {
                    let name = caps.get(1).unwrap().as_str().to_string();
                    let current_version = caps.get(2).unwrap().as_str().to_string();
                    let new_version = caps.get(3).unwrap().as_str().to_string();

                    updates.push(UpdateInfo {
                        package_id: format!("{}/{}", self.config.name, name),
                        name: name.clone(),
                        source: self.config.source.clone(),
                        current_version,
                        new_version,
                    });
                }
            }
        }

        updates
    }
}
