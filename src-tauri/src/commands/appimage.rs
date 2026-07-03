use crate::errors::AppError;
use crate::shell::ShellExecutor;
use base64::Engine;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize)]
pub struct AppImageInfo {
    pub name: String,
    pub version: String,
    pub description: String,
    pub icon_path: Option<String>,
    pub desktop_file_path: Option<String>,
    pub source_path: String,
    pub installed_path: Option<String>,
}

// ── Paths ──

fn apps_base() -> Result<PathBuf, AppError> {
    let dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."))
        .join("arcway").join("appimages");
    fs::create_dir_all(&dir).map_err(|e| AppError::CommandFailed(e.to_string()))?;
    Ok(dir)
}

fn desktop_base() -> Result<PathBuf, AppError> {
    let dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."))
        .join("applications");
    fs::create_dir_all(&dir).map_err(|e| AppError::CommandFailed(e.to_string()))?;
    Ok(dir)
}

fn sanitize(name: &str) -> String {
    name.replace(' ', "_").replace('/', "_").replace('\\', "_")
        .chars().filter(|c| c.is_alphanumeric() || *c == '_')
        .collect::<String>().to_lowercase()
}

// ── .desktop parsing ──

/// Returns (Name, Comment, Exec, Icon)
fn parse_desktop_full(path: &std::path::Path) -> Option<(String, String, String, String)> {
    let text = fs::read_to_string(path).ok()?;
    let mut name = String::new();
    let mut comment = String::new();
    let mut exec = String::new();
    let mut icon = String::new();
    for line in text.lines() {
        let l = line.trim();
        if l.starts_with("Name=") && name.is_empty() { name = l[5..].to_string(); }
        else if l.starts_with("Comment=") && comment.is_empty() { comment = l[8..].to_string(); }
        else if l.starts_with("Exec=") && exec.is_empty() { exec = l[5..].to_string(); }
        else if l.starts_with("Icon=") && icon.is_empty() { icon = l[5..].to_string(); }
    }
    if name.is_empty() { return None; }
    Some((name, comment, exec, icon))
}

// ── Icon resolution ──

/// Resolve an icon name (from .desktop) to a file path
fn resolve_icon(icon_name: &str, appdir: &std::path::Path) -> Option<PathBuf> {
    if icon_name.is_empty() { return None; }

    // If it's already a full path, use it
    let as_path = std::path::Path::new(icon_name);
    if as_path.is_absolute() && as_path.exists() {
        return Some(as_path.to_path_buf());
    }

    // Search standard icon directories
    let icon_dirs = [
        appdir.join("usr").join("share").join("icons"),
        appdir.join("usr").join("share"),
        appdir.to_path_buf(),
    ];

    for base in &icon_dirs {
        if !base.exists() { continue; }
        // Try exact match with common extensions
        for ext in &["png", "svg", "xpm"] {
            let candidate = base.join(format!("{}.{}", icon_name, ext));
            if candidate.exists() { return Some(candidate); }
        }
        // Try recursive search by name
        if let Some(found) = find_icon_by_name(base, icon_name, 4) {
            return Some(found);
        }
    }

    // Fallback: any icon in the extracted dir
    find_any_icon(appdir, 4)
}

fn find_icon_by_name(dir: &std::path::Path, name: &str, depth: usize) -> Option<PathBuf> {
    if depth == 0 || !dir.exists() { return None; }
    if let Ok(rd) = fs::read_dir(dir) {
        for e in rd.flatten() {
            let p = e.path();
            if p.is_file() {
                let stem = p.file_stem().and_then(|x| x.to_str()).unwrap_or("");
                let ext = p.extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase();
                if stem == name && matches!(ext.as_str(), "png" | "svg" | "xpm") {
                    return Some(p);
                }
            }
        }
        for e in fs::read_dir(dir).into_iter().flatten().flatten() {
            let p = e.path();
            if p.is_dir() {
                let n = p.file_name().and_then(|x| x.to_str()).unwrap_or("");
                if !matches!(n, "locale" | "translations" | "doc" | "man" | "fonts" | "lib" | "bin" | "sbin") {
                    if let Some(f) = find_icon_by_name(&p, name, depth - 1) { return Some(f); }
                }
            }
        }
    }
    None
}

fn find_any_icon(dir: &std::path::Path, depth: usize) -> Option<PathBuf> {
    if depth == 0 || !dir.exists() { return None; }
    if let Ok(rd) = fs::read_dir(dir) {
        // Prefer large icons
        for e in rd.flatten() {
            let p = e.path();
            if p.is_file() {
                let ext = p.extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase();
                if matches!(ext.as_str(), "png" | "svg") {
                    let s = p.to_string_lossy().to_lowercase();
                    if s.contains("256x256") || s.contains("512x512") { return Some(p); }
                }
            }
        }
        for e in fs::read_dir(dir).into_iter().flatten().flatten() {
            let p = e.path();
            if p.is_file() {
                let ext = p.extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase();
                if matches!(ext.as_str(), "png" | "svg") { return Some(p); }
            }
        }
        for e in fs::read_dir(dir).into_iter().flatten().flatten() {
            let p = e.path();
            if p.is_dir() {
                let n = p.file_name().and_then(|x| x.to_str()).unwrap_or("");
                if !matches!(n, "locale" | "translations" | "doc" | "man" | "fonts" | "lib" | "bin" | "sbin") {
                    if let Some(f) = find_any_icon(&p, depth - 1) { return Some(f); }
                }
            }
        }
    }
    None
}

// ── Install ──

#[tauri::command]
pub async fn install_appimage(source_path: String) -> Result<AppImageInfo, AppError> {
    let src = std::path::Path::new(&source_path);
    if !src.exists() { return Err(AppError::NotFound(format!("File not found: {}", source_path))); }
    if !source_path.to_lowercase().ends_with(".appimage") {
        return Err(AppError::ParseError("Not an AppImage".to_string()));
    }

    let base = apps_base()?;

    // Make source executable (use sudo if needed)
    let executor = ShellExecutor::new();
    let src_str = src.to_string_lossy();
    let _ = executor.run_command("chmod", &["755", &src_str]).await;

    // Extract to temp dir
    let tmp = base.join("_extract_tmp");
    let _ = fs::remove_dir_all(&tmp);
    fs::create_dir_all(&tmp).map_err(|e| AppError::CommandFailed(e.to_string()))?;

    // Try extraction without sudo first (works for most AppImages)
    let output = std::process::Command::new(&*src_str)
        .arg("--appimage-extract")
        .current_dir(&tmp)
        .output()
        .map_err(|e| AppError::CommandFailed(format!("Extract failed: {}", e)))?;

    // If failed, try with sudo + password
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("Permission denied") || stderr.contains("permission") {
            log::info!("Extract needs sudo, retrying with password");
            use crate::shell::executor::get_sudo_password;
            if let Some(password) = get_sudo_password() {
                let mut child = std::process::Command::new("sudo")
                    .arg("-S")
                    .arg(&*src_str)
                    .arg("--appimage-extract")
                    .current_dir(&tmp)
                    .stdin(std::process::Stdio::piped())
                    .stdout(std::process::Stdio::piped())
                    .stderr(std::process::Stdio::piped())
                    .spawn()
                    .map_err(|e| AppError::CommandFailed(format!("Spawn failed: {}", e)))?;

                if let Some(mut stdin) = child.stdin.take() {
                    use std::io::Write;
                    let _ = stdin.write_all(format!("{}\n", password).as_bytes());
                    drop(stdin);
                }

                let _ = child.wait();
            } else {
                log::warn!("No sudo password available, extract may have failed");
            }
        }
    }

    // The extracted content is in tmp/squashfs-root/
    let appdir = tmp.join("squashfs-root");

    // Find .desktop file
    let mut app_name = src.file_stem().and_then(|s| s.to_str()).unwrap_or("app").replace('_', " ");
    let mut description = String::new();
    let mut icon_name_in_desktop = String::new();

    let search_dirs = [
        appdir.join("usr").join("share").join("applications"),
        appdir.clone(),
    ];

    for dir in &search_dirs {
        if !dir.exists() { continue; }
        if let Ok(rd) = fs::read_dir(dir) {
            for e in rd.flatten() {
                let p = e.path();
                if p.extension().and_then(|x| x.to_str()) == Some("desktop") {
                    if let Some((n, c, _, ic)) = parse_desktop_full(&p) {
                        app_name = n;
                        description = c;
                        icon_name_in_desktop = ic;
                        log::info!("Found .desktop: Name={}, Comment={}, Icon={}", app_name, description, icon_name_in_desktop);
                        break;
                    }
                }
            }
        }
        if !description.is_empty() { break; }
    }

    // Resolve icon: first from .desktop Icon= field, then fallback search
    let icon_path = if !icon_name_in_desktop.is_empty() {
        resolve_icon(&icon_name_in_desktop, &appdir)
    } else {
        find_any_icon(&appdir, 4)
    };

    // Create app folder
    let safe = sanitize(&app_name);
    let app_folder = base.join(&safe);
    let _ = fs::remove_dir_all(&app_folder);
    fs::create_dir_all(&app_folder).map_err(|e| AppError::CommandFailed(e.to_string()))?;

    // Copy AppImage
    let ext = src.extension().and_then(|x| x.to_str()).unwrap_or("AppImage");
    let dest = app_folder.join(format!("{}.{}", safe, ext));
    fs::copy(src, &dest).map_err(|e| AppError::CommandFailed(e.to_string()))?;

    // Make installed AppImage executable
    let dest_str = dest.to_string_lossy();
    let _ = executor.run_command("chmod", &["755", &dest_str]).await;

    // Copy icon
    let mut final_icon: Option<String> = None;
    if let Some(ref si) = icon_path {
        let iext = si.extension().and_then(|x| x.to_str()).unwrap_or("png");
        let idest = app_folder.join(format!("icon.{}", iext));
        if fs::copy(si, &idest).is_ok() {
            final_icon = Some(idest.to_string_lossy().to_string());
        }
    }

    // Write .desktop
    let desktop = desktop_base()?.join(format!("{}.desktop", safe));
    let icon_line = final_icon.as_deref().unwrap_or("");
    let content = format!(
        "[Desktop Entry]\nType=Application\nName={}\nComment={}\nExec={} %U\nIcon={}\nTerminal=false\nCategories=Utility;\n",
        app_name, description, dest.to_string_lossy(), icon_line,
    );
    fs::write(&desktop, content).map_err(|e| AppError::CommandFailed(e.to_string()))?;

    // Cleanup
    let _ = fs::remove_dir_all(&tmp);

    log::info!("Installed: {} (icon: {:?})", app_name, final_icon);

    Ok(AppImageInfo {
        name: app_name,
        version: "1.0.0".to_string(),
        description,
        icon_path: final_icon,
        desktop_file_path: Some(desktop.to_string_lossy().to_string()),
        source_path,
        installed_path: Some(dest.to_string_lossy().to_string()),
    })
}

// ── Update ──

#[tauri::command]
pub async fn update_appimage(name: String, source_path: String) -> Result<AppImageInfo, AppError> {
    let _ = uninstall_appimage(name).await;
    install_appimage(source_path).await
}

// ── Uninstall ──

#[tauri::command]
pub async fn uninstall_appimage(name: String) -> Result<(), AppError> {
    let safe = sanitize(&name);
    let dir = apps_base()?.join(&safe);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| AppError::CommandFailed(e.to_string()))?;
    }
    let desktop = desktop_base()?.join(format!("{}.desktop", safe));
    if desktop.exists() { let _ = fs::remove_file(&desktop); }
    Ok(())
}

// ── List ──

#[tauri::command]
pub async fn list_appimages() -> Result<Vec<AppImageInfo>, AppError> {
    let base = apps_base()?;
    let mut results = Vec::new();

    if !base.exists() { return Ok(results); }

    for entry in fs::read_dir(&base).map_err(|e| AppError::CommandFailed(e.to_string()))? {
        let entry = entry.map_err(|e| AppError::CommandFailed(e.to_string()))?;
        let path = entry.path();
        if !path.is_dir() { continue; }

        let dir_name = path.file_name().and_then(|f| f.to_str()).unwrap_or("");
        if dir_name.starts_with('_') { continue; }

        let appimage = fs::read_dir(&path)
            .into_iter().flatten().flatten()
            .find(|e| e.path().extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase() == "appimage")
            .map(|e| e.path());
        let appimage = match appimage { Some(p) => p, None => continue };

        let raw_name = dir_name.replace('_', " ");
        let desktop = desktop_base()?.join(format!("{}.desktop", dir_name));

        let (display_name, description) = if desktop.exists() {
            parse_desktop_full(&desktop).map(|(n, c, _, _)| (n, c)).unwrap_or((raw_name.clone(), String::new()))
        } else {
            (raw_name.clone(), String::new())
        };

        let icon = ["icon.png", "icon.svg"]
            .iter()
            .map(|f| path.join(f))
            .find(|p| p.exists())
            .map(|p| p.to_string_lossy().to_string());

        results.push(AppImageInfo {
            name: display_name,
            version: "1.0.0".to_string(),
            description,
            icon_path: icon,
            desktop_file_path: if desktop.exists() { Some(desktop.to_string_lossy().to_string()) } else { None },
            source_path: String::new(),
            installed_path: Some(appimage.to_string_lossy().to_string()),
        });
    }

    Ok(results)
}

// ── Pick and install ──

#[tauri::command]
pub async fn pick_and_install_appimage() -> Result<Option<AppImageInfo>, AppError> {
    let output = std::process::Command::new("zenity")
        .args(["--file-selection", "--title=Select AppImage", "--file-filter=AppImage|*.AppImage *.appimage"])
        .output();

    let path = match output {
        Ok(o) if o.status.success() => {
            let p = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if p.is_empty() { return Ok(None); }
            p
        }
        _ => {
            let output = std::process::Command::new("kdialog")
                .args(["--getopenfilename", ".", "*.AppImage *.appimage"])
                .output();
            match output {
                Ok(o) if o.status.success() => {
                    let p = String::from_utf8_lossy(&o.stdout).trim().to_string();
                    if p.is_empty() { return Ok(None); }
                    p
                }
                _ => return Ok(None),
            }
        }
    };

    let result = install_appimage(path).await?;
    Ok(Some(result))
}

#[tauri::command]
pub async fn get_appimage_icon(path: String) -> Result<String, AppError> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err(AppError::NotFound(format!("Icon not found: {}", path)));
    }

    let data = fs::read(p).map_err(|e| AppError::CommandFailed(format!("Failed to read icon: {}", e)))?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);

    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("png");
    let mime = match ext {
        "svg" => "image/svg+xml",
        "xpm" => "image/x-xpixmap",
        _ => "image/png",
    };

    Ok(format!("data:{};base64,{}", mime, b64))
}
