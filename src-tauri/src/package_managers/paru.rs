use crate::errors::AppError;
use crate::models::*;
use crate::package_managers::aur_helper::{AurHelper, PARU_CONFIG};
use crate::package_managers::manager::PackageManager;
use crate::shell::ShellExecutor;
use async_trait::async_trait;
use tokio::sync::mpsc;

pub struct ParuManager {
    helper: AurHelper,
}

impl ParuManager {
    pub fn new(executor: ShellExecutor) -> Self {
        ParuManager {
            helper: AurHelper::new(&PARU_CONFIG, executor),
        }
    }
}

#[async_trait]
impl PackageManager for ParuManager {
    fn name(&self) -> &str {
        "paru"
    }

    async fn search(&self, query: &str) -> Result<Vec<Package>, AppError> {
        self.helper.search(query).await
    }

    async fn install(
        &self,
        id: &str,
        sender: mpsc::UnboundedSender<ProgressEvent>,
    ) -> Result<(), AppError> {
        self.helper.install(id, sender).await
    }

    async fn uninstall(
        &self,
        id: &str,
        sender: mpsc::UnboundedSender<ProgressEvent>,
    ) -> Result<(), AppError> {
        self.helper.uninstall(id, sender).await
    }

    async fn list_installed(&self) -> Result<Vec<InstalledPackage>, AppError> {
        self.helper.list_installed().await
    }

    async fn check_updates(&self) -> Result<Vec<UpdateInfo>, AppError> {
        self.helper.check_updates().await
    }
}
