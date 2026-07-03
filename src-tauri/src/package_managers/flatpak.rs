use crate::errors::AppError;
use crate::models::*;
use crate::package_managers::manager::PackageManager;
use crate::shell::ShellExecutor;
use async_trait::async_trait;
use tokio::sync::mpsc;

pub struct FlatpakManager {
    executor: ShellExecutor,
}

impl FlatpakManager {
    pub fn new(executor: ShellExecutor) -> Self {
        FlatpakManager { executor }
    }

    fn parse_search_output(&self, output: &str) -> Vec<Package> {
        let mut packages = Vec::new();
        let lines: Vec<&str> = output.lines().collect();

        if lines.is_empty() {
            return packages;
        }

        // Skip header line if present
        let start = if lines.first().map_or(false, |l| l.contains("Name")) {
            1
        } else {
            0
        };

        for line in &lines[start..] {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 3 {
                // Columns: name(0), description(1), application(2), version(3)
                let name = parts[0].trim().to_string();
                let description = parts[1].trim().to_string();

                let app_id = parts.get(2).map(|s| s.trim().to_string()).unwrap_or_else(|| name.clone());
                let version = parts.get(3).map(|s| s.trim().to_string()).unwrap_or_default();

                packages.push(Package {
                    id: format!("flatpak/{}", app_id),
                    name,
                    description,
                    source: PackageSource::Flatpak,
                    version,
                    installed_version: None,
                    size: None,
                    icon_url: None,
                    screenshot_url: None,
                    homepage: None,
                    license: None,
                    tags: vec!["flatpak".to_string()],
                });
            }
        }

        packages
    }

    fn parse_list_output(&self, output: &str) -> Vec<InstalledPackage> {
        let mut packages = Vec::new();

        for line in output.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 3 {
                let name = parts[0].trim().to_string();
                let app_id = parts[1].trim().to_string();
                let version = parts[2].trim().to_string();

                packages.push(InstalledPackage {
                    package_id: format!("flatpak/{}", app_id),
                    name,
                    source: PackageSource::Flatpak,
                    version,
                    size: None,
                });
            }
        }

        packages
    }
}

#[async_trait]
impl PackageManager for FlatpakManager {
    fn name(&self) -> &str {
        "flatpak"
    }

    async fn search(&self, query: &str) -> Result<Vec<Package>, AppError> {
        let output = self
            .executor
            .run_command("flatpak", &["search", "--columns=name,description,application,version", query])
            .await?;

        Ok(self.parse_search_output(&output))
    }

    async fn install(
        &self,
        id: &str,
        sender: mpsc::UnboundedSender<ProgressEvent>,
    ) -> Result<(), AppError> {
        let flatpak_id = id.strip_prefix("flatpak/").unwrap_or(id);

        // --user: install to user namespace (avoids "multiple installations" error)
        // --assumeyes: auto-confirm without prompts
        self.executor
            .run_command_with_progress(
                "flatpak",
                &["install", "--user", "--assumeyes", "flathub", flatpak_id],
                sender,
                id,
            )
            .await?;

        Ok(())
    }

    async fn uninstall(
        &self,
        id: &str,
        sender: mpsc::UnboundedSender<ProgressEvent>,
    ) -> Result<(), AppError> {
        let flatpak_id = id.strip_prefix("flatpak/").unwrap_or(id);

        // Try with --user first, fallback without
        let result = self
            .executor
            .run_command_with_progress(
                "flatpak",
                &["uninstall", "--user", "--assumeyes", flatpak_id],
                sender.clone(),
                id,
            )
            .await;

        if result.is_err() {
            // Fallback: try without --user
            log::debug!("flatpak uninstall with --user failed, trying without");
            self.executor
                .run_command_with_progress(
                    "flatpak",
                    &["uninstall", "--assumeyes", flatpak_id],
                    sender,
                    id,
                )
                .await?;
        }

        Ok(())
    }

    async fn list_installed(&self) -> Result<Vec<InstalledPackage>, AppError> {
        let output = self
            .executor
            .run_command(
                "flatpak",
                &["list", "--columns=name,application,version"],
            )
            .await?;

        Ok(self.parse_list_output(&output))
    }

    async fn check_updates(&self) -> Result<Vec<UpdateInfo>, AppError> {
        let output = self
            .executor
            .run_command("flatpak", &["update", "--no-deploy", "--noninteractive"])
            .await?;

        let mut updates = Vec::new();
        for line in output.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with("Finding") || line.starts_with("Looking") {
                continue;
            }

            // Flatpak update lines look like: "org.example.App 1.0 → 1.1"
            if let Some(arrow_pos) = line.find("→") {
                let before_arrow = line[..arrow_pos].trim();
                let after_arrow = line[arrow_pos + 1..].trim();

                let parts: Vec<&str> = before_arrow.split_whitespace().collect();
                if parts.len() >= 2 {
                    let name = parts[0].to_string();
                    let current_version = parts[1].to_string();
                    let new_version = after_arrow.to_string();

                    updates.push(UpdateInfo {
                        package_id: format!("flatpak/{}", name),
                        name: name.clone(),
                        source: PackageSource::Flatpak,
                        current_version,
                        new_version,
                    });
                }
            }
        }

        Ok(updates)
    }
}
