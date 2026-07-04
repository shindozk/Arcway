use crate::auth::supabase::{AuthResponse, UserInfo};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Session stays valid for 15 days. After that, user must re-login.
const SESSION_MAX_DAYS: i64 = 15;
const SESSION_MAX_SECONDS: i64 = SESSION_MAX_DAYS * 24 * 60 * 60;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SessionData {
    access_token: String,
    refresh_token: String,
    user: UserInfo,
    /// When the access_token expires (short-lived, ~1 hour)
    expires_at: i64,
    /// When the session was created. Used to enforce the 15-day lifetime.
    session_created_at: i64,
}

pub struct SessionManager {
    data: Mutex<Option<SessionData>>,
    file_path: Option<PathBuf>,
}

impl SessionManager {
    pub fn load_from_file(path: &PathBuf) -> Self {
        let now = chrono::Utc::now().timestamp();
        let data = if path.exists() {
            fs::read_to_string(path)
                .ok()
                .and_then(|s| serde_json::from_str::<SessionData>(&s).ok())
                .filter(|d| {
                    // Keep session if within 15-day lifetime
                    // (even if access_token expired — will be refreshed on use)
                    d.session_created_at + SESSION_MAX_SECONDS > now
                })
        } else {
            None
        };

        if let Some(ref d) = data {
            let age_days = (now - d.session_created_at) / 86400;
            let token_valid = d.expires_at > now;
            log::info!(
                "Loaded session from file (age: {}d, access_token: {})",
                age_days,
                if token_valid { "valid" } else { "expired (will refresh)" }
            );
        }

        Self {
            data: Mutex::new(data),
            file_path: Some(path.clone()),
        }
    }

    pub fn save_session(&self, response: &AuthResponse) {
        let now = chrono::Utc::now().timestamp();
        let expires_at = now + response.expires_in;

        // Preserve session_created_at from existing session (for refreshes)
        // or set to now (for fresh logins)
        let session_created_at = {
            let data = self.data.lock().unwrap();
            data.as_ref()
                .map(|d| d.session_created_at)
                .unwrap_or(now)
        };

        let session = SessionData {
            access_token: response.access_token.clone(),
            refresh_token: response.refresh_token.clone(),
            user: response.user.clone(),
            expires_at,
            session_created_at,
        };

        *self.data.lock().unwrap() = Some(session);

        if let Some(ref path) = self.file_path {
            self.save_to_file(path);
        }
    }

    pub fn get_token(&self) -> Option<String> {
        let data = self.data.lock().unwrap();
        data.as_ref().and_then(|d| {
            if d.expires_at > chrono::Utc::now().timestamp() {
                Some(d.access_token.clone())
            } else {
                None
            }
        })
    }

    pub fn update_user(&self, new_user: &UserInfo) {
        let mut data = self.data.lock().unwrap();
        if let Some(ref mut session) = *data {
            session.user = new_user.clone();
            if let Some(ref path) = self.file_path {
                drop(data);
                let _ = self.save_to_file_with_path(path, &self.data.lock().unwrap());
            }
        }
    }

    fn save_to_file_with_path(&self, path: &PathBuf, data: &Option<SessionData>) {
        if let Some(ref session) = *data {
            if let Some(parent) = path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            if let Ok(json) = serde_json::to_string(session) {
                let _ = fs::write(path, json);
            }
        }
    }

    pub fn get_user(&self) -> Option<UserInfo> {
        let data = self.data.lock().unwrap();
        data.as_ref().and_then(|d| {
            let now = chrono::Utc::now().timestamp();
            if d.session_created_at + SESSION_MAX_SECONDS > now {
                Some(d.user.clone())
            } else {
                None
            }
        })
    }

    /// Returns true if we have a valid refresh token within the 15-day window.
    /// The access token may be expired — that's OK, it will be refreshed.
    pub fn is_authenticated(&self) -> bool {
        let data = self.data.lock().unwrap();
        data.as_ref().map_or(false, |d| {
            let now = chrono::Utc::now().timestamp();
            !d.refresh_token.is_empty() && d.session_created_at + SESSION_MAX_SECONDS > now
        })
    }

    pub fn clear_session(&self) {
        *self.data.lock().unwrap() = None;
        if let Some(ref path) = self.file_path {
            let _ = fs::remove_file(path);
        }
    }

    pub fn get_refresh_token(&self) -> Option<String> {
        let data = self.data.lock().unwrap();
        data.as_ref().and_then(|d| {
            let now = chrono::Utc::now().timestamp();
            if d.session_created_at + SESSION_MAX_SECONDS > now {
                Some(d.refresh_token.clone())
            } else {
                None
            }
        })
    }

    fn save_to_file(&self, path: &PathBuf) {
        let data = self.data.lock().unwrap();
        if let Some(ref session) = *data {
            if let Some(parent) = path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            if let Ok(json) = serde_json::to_string(session) {
                let _ = fs::write(path, json);
            }
        }
    }
}
