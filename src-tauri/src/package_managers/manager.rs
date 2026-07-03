use crate::errors::AppError;
use crate::models::*;
use crate::package_managers::{FlatpakManager, ParuManager, YayManager};
use crate::shell::ShellExecutor;
use async_trait::async_trait;
use std::collections::HashSet;
use tokio::sync::mpsc;

#[async_trait]
pub trait PackageManager: Send + Sync {
    fn name(&self) -> &str;

    async fn search(&self, query: &str) -> Result<Vec<Package>, AppError>;
    async fn install(
        &self,
        id: &str,
        sender: mpsc::UnboundedSender<ProgressEvent>,
    ) -> Result<(), AppError>;
    async fn uninstall(
        &self,
        id: &str,
        sender: mpsc::UnboundedSender<ProgressEvent>,
    ) -> Result<(), AppError>;
    async fn list_installed(&self) -> Result<Vec<InstalledPackage>, AppError>;
    async fn check_updates(&self) -> Result<Vec<UpdateInfo>, AppError>;
}

pub struct MultiManager {
    managers: Vec<Box<dyn PackageManager>>,
}

impl MultiManager {
    pub fn new() -> Self {
        let executor = ShellExecutor::new();
        let managers: Vec<Box<dyn PackageManager>> = vec![
            Box::new(FlatpakManager::new(executor.clone())),
            Box::new(YayManager::new(executor.clone())),
            Box::new(ParuManager::new(executor)),
        ];
        MultiManager { managers }
    }

    pub fn with_managers(managers: Vec<Box<dyn PackageManager>>) -> Self {
        MultiManager { managers }
    }

    pub async fn search_all(&self, query: &str) -> Result<Vec<Package>, AppError> {
        let mut all_packages = Vec::new();
        let mut seen = HashSet::new();

        let results = futures::future::join_all(
            self.managers.iter().map(|m| m.search(query)),
        )
        .await;

        for result in results {
            match result {
                Ok(packages) => {
                    for pkg in packages {
                        let key = format!("{}:{}", pkg.name, pkg.source);
                        if seen.insert(key) {
                            all_packages.push(pkg);
                        }
                    }
                }
                Err(e) => {
                    log::warn!("Search failed for a manager: {}", e);
                }
            }
        }

        all_packages.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(all_packages)
    }

    pub async fn search_in_sources(
        &self,
        query: &str,
        sources: &[PackageSource],
    ) -> Result<Vec<Package>, AppError> {
        let mut all_packages = Vec::new();
        let mut seen = HashSet::new();

        let futures: Vec<_> = self
            .managers
            .iter()
            .filter(|m| sources.iter().any(|s| s.to_string() == m.name()))
            .map(|m| m.search(query))
            .collect();

        let results = futures::future::join_all(futures).await;

        for result in results {
            match result {
                Ok(packages) => {
                    for pkg in packages {
                        let key = format!("{}:{}", pkg.name, pkg.source);
                        if seen.insert(key) {
                            all_packages.push(pkg);
                        }
                    }
                }
                Err(e) => {
                    log::warn!("Search failed: {}", e);
                }
            }
        }

        Ok(all_packages)
    }

    pub async fn install_package(
        &self,
        id: &str,
        source: &PackageSource,
        sender: mpsc::UnboundedSender<ProgressEvent>,
    ) -> Result<(), AppError> {
        for manager in &self.managers {
            if manager.name() == source.to_string() {
                return manager.install(id, sender).await;
            }
        }
        Err(AppError::NotFound(format!(
            "No manager found for source: {}",
            source
        )))
    }

    pub async fn uninstall_package(
        &self,
        id: &str,
        source: &PackageSource,
        sender: mpsc::UnboundedSender<ProgressEvent>,
    ) -> Result<(), AppError> {
        for manager in &self.managers {
            if manager.name() == source.to_string() {
                return manager.uninstall(id, sender).await;
            }
        }
        Err(AppError::NotFound(format!(
            "No manager found for source: {}",
            source
        )))
    }

    pub async fn list_all_installed(&self) -> Result<Vec<InstalledPackage>, AppError> {
        let mut all_installed = Vec::new();
        let mut seen = HashSet::new();

        let results = futures::future::join_all(
            self.managers.iter().map(|m| m.list_installed()),
        )
        .await;

        for result in results {
            match result {
                Ok(packages) => {
                    for pkg in packages {
                        let key = format!("{}:{}", pkg.name, pkg.source);
                        if seen.insert(key) {
                            all_installed.push(pkg);
                        }
                    }
                }
                Err(e) => {
                    log::warn!("List installed failed for a manager: {}", e);
                }
            }
        }

        all_installed.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(all_installed)
    }

    pub async fn check_all_updates(&self) -> Result<Vec<UpdateInfo>, AppError> {
        let mut all_updates = Vec::new();
        let mut seen = HashSet::new();

        let results = futures::future::join_all(
            self.managers.iter().map(|m| m.check_updates()),
        )
        .await;

        for result in results {
            match result {
                Ok(updates) => {
                    for update in updates {
                        let key = format!("{}:{}", update.name, update.source);
                        if seen.insert(key) {
                            all_updates.push(update);
                        }
                    }
                }
                Err(e) => {
                    log::warn!("Check updates failed for a manager: {}", e);
                }
            }
        }

        all_updates.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(all_updates)
    }
}

impl Default for MultiManager {
    fn default() -> Self {
        Self::new()
    }
}
