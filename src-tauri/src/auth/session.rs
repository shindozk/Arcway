use crate::auth::supabase::{AuthResponse, UserInfo};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SessionData {
    access_token: String,
    refresh_token: String,
    user: UserInfo,
    expires_at: i64,
}

pub struct SessionManager {
    data: Mutex<Option<SessionData>>,
    file_path: Option<PathBuf>,
}

impl SessionManager {
    pub fn load_from_file(path: &PathBuf) -> Self {
        let data = if path.exists() {
            fs::read_to_string(path)
                .ok()
                .and_then(|s| serde_json::from_str::<SessionData>(&s).ok())
                .filter(|d| d.expires_at > chrono::Utc::now().timestamp())
        } else {
            None
        };

        if data.is_some() {
            log::info!("Loaded valid session from file");
        }

        Self {
            data: Mutex::new(data),
            file_path: Some(path.clone()),
        }
    }

    pub fn save_session(&self, response: &AuthResponse) {
        let expires_at = chrono::Utc::now().timestamp() + response.expires_in;
        let session = SessionData {
            access_token: response.access_token.clone(),
            refresh_token: response.refresh_token.clone(),
            user: response.user.clone(),
            expires_at,
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
            if d.expires_at > chrono::Utc::now().timestamp() {
                Some(d.user.clone())
            } else {
                None
            }
        })
    }

    pub fn is_authenticated(&self) -> bool {
        self.get_token().is_some()
    }

    pub fn clear_session(&self) {
        *self.data.lock().unwrap() = None;
        if let Some(ref path) = self.file_path {
            let _ = fs::remove_file(path);
        }
    }

    pub fn get_refresh_token(&self) -> Option<String> {
        let data = self.data.lock().unwrap();
        data.as_ref().map(|d| d.refresh_token.clone())
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
