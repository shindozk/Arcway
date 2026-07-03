use crate::errors::AppError;
use crate::models::*;
use crate::package_managers::aur_helper::{AurHelper, YAY_CONFIG};
use crate::package_managers::manager::PackageManager;
use crate::shell::ShellExecutor;
use async_trait::async_trait;
use tokio::sync::mpsc;

pub struct YayManager {
    helper: AurHelper,
}

impl YayManager {
    pub fn new(executor: ShellExecutor) -> Self {
        YayManager {
            helper: AurHelper::new(&YAY_CONFIG, executor),
        }
    }
}

#[async_trait]
impl PackageManager for YayManager {
    fn name(&self) -> &str {
        "yay"
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
