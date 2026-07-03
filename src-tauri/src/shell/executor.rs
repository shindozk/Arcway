use crate::errors::AppError;
use crate::models::ProgressEvent;
use once_cell::sync::OnceCell;
use regex::Regex;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;

static SUDO_PASSWORD: OnceCell<std::sync::Mutex<String>> = OnceCell::new();

pub fn set_sudo_password(password: String) {
    let _ = SUDO_PASSWORD.set(std::sync::Mutex::new(password));
}

pub fn get_sudo_password() -> Option<String> {
    SUDO_PASSWORD.get().and_then(|m| m.lock().ok()).map(|p| p.clone())
}

pub fn has_sudo_password() -> bool {
    SUDO_PASSWORD.get().is_some()
}

#[derive(Clone)]
pub struct ShellExecutor;

impl ShellExecutor {
    pub fn new() -> Self {
        ShellExecutor
    }

    /// Run a command and capture full output
    pub async fn run_command(&self, program: &str, args: &[&str]) -> Result<String, AppError> {
        log::debug!("Running: {} {:?}", program, args);

        let output = Command::new(program)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| {
                let msg = format!("Failed to execute '{}': {}", program, e);
                log::error!("{}", msg);
                AppError::CommandFailed(msg)
            })?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if !output.status.success() {
            let msg = if stderr.trim().is_empty() {
                format!("Command '{}' exited with status: {}", program, output.status)
            } else {
                format!("Command '{}' failed: {}", program, stderr.trim())
            };
            log::error!("{}", msg);
            return Err(AppError::CommandFailed(msg));
        }

        log::debug!("Command output: {} bytes", stdout.len());
        Ok(stdout)
    }

    /// Run a command and return (exit_code, output) — doesn't fail on non-zero exit
    pub async fn run_command_allow_fail(
        &self,
        program: &str,
        args: &[&str],
    ) -> Result<(i32, String), AppError> {
        log::debug!("Running (allow fail): {} {:?}", program, args);

        let output = Command::new(program)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| AppError::CommandFailed(format!("Failed to execute '{}': {}", program, e)))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let code = output.status.code().unwrap_or(1);

        log::debug!("Command exited with code {}: {} bytes", code, stdout.len());
        Ok((code, stdout))
    }

    /// Run a command with streaming progress output
    pub async fn run_command_with_progress(
        &self,
        program: &str,
        args: &[&str],
        sender: mpsc::UnboundedSender<ProgressEvent>,
        package_id: &str,
    ) -> Result<String, AppError> {
        log::debug!("Running with progress: {} {:?}", program, args);

        let mut child = Command::new(program)
            .args(args)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| {
                let msg = format!("Failed to spawn '{}': {}", program, e);
                log::error!("{}", msg);
                AppError::CommandFailed(msg)
            })?;

        let stdout = child.stdout.take().expect("Failed to capture stdout");
        let stderr = child.stderr.take().expect("Failed to capture stderr");

        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        let mut full_output = String::new();

        let progress_re = Regex::new(r"\[(\d+)/(\d+)\]").ok();
        let percent_re = Regex::new(r"(\d+(?:\.\d+)?)\s*%").ok();
        let mut last_percent: f32 = 0.0;

        while let Some(line) = lines.next_line().await.unwrap_or(None) {
            let line_str = line.clone();
            full_output.push_str(&line);
            full_output.push('\n');

            let progress = Self::parse_progress(&line_str, &progress_re, &percent_re, &mut last_percent);

            let _ = sender.send(ProgressEvent {
                package_id: package_id.to_string(),
                message: line_str,
                percentage: progress,
            });
        }

        // Capture stderr
        let stderr_reader = BufReader::new(stderr);
        let mut stderr_lines = stderr_reader.lines();
        while let Some(line) = stderr_lines.next_line().await.unwrap_or(None) {
            if !line.trim().is_empty() {
                log::debug!("stderr: {}", line);
            }
            full_output.push_str(&line);
            full_output.push('\n');
        }

        let status = child.wait().await.map_err(|e| {
            AppError::CommandFailed(format!("Failed to wait for '{}': {}", program, e))
        })?;

        if !status.success() {
            let code = status.code().unwrap_or(-1);
            let stderr_text = full_output.lines()
                .filter(|l| !l.trim().is_empty())
                .last()
                .unwrap_or("Unknown error");
            let msg = format!("{} failed (exit code {}): {}", program, code, stderr_text);
            log::error!("{}", msg);
            return Err(AppError::CommandFailed(msg));
        }

        Ok(full_output)
    }

    fn parse_progress(
        line: &str,
        progress_re: &Option<Regex>,
        percent_re: &Option<Regex>,
        last_percent: &mut f32,
    ) -> Option<f32> {
        if let Some(re) = progress_re {
            if let Some(caps) = re.captures(line) {
                if let (Some(current), Some(total)) = (caps.get(1), caps.get(2)) {
                    if let (Ok(c), Ok(t)) = (
                        current.as_str().parse::<f32>(),
                        total.as_str().parse::<f32>(),
                    ) {
                        if t > 0.0 {
                            let pct = (c / t) * 100.0;
                            *last_percent = pct;
                            return Some(pct);
                        }
                    }
                }
            }
        }

        if let Some(re) = percent_re {
            if let Some(caps) = re.captures(line) {
                if let Some(m) = caps.get(1) {
                    if let Ok(pct) = m.as_str().parse::<f32>() {
                        *last_percent = pct;
                        return Some(pct);
                    }
                }
            }
        }

        Some(*last_percent)
    }
}

impl Default for ShellExecutor {
    fn default() -> Self {
        Self::new()
    }
}
