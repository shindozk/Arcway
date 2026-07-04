use tauri::State;

use crate::auth::session::SessionManager;
use crate::auth::supabase::{AuthResponse, SupabaseClient, UserInfo};
use crate::errors::AppError;

#[tauri::command]
pub async fn update_profile(
    display_name: Option<String>,
    avatar_url: Option<String>,
    banner_url: Option<String>,
    state: State<'_, AuthState>,
) -> Result<UserInfo, AppError> {
    let token = state.session.get_token()
        .ok_or_else(|| AppError::CommandFailed("Not authenticated".to_string()))?;

    let mut metadata = serde_json::json!({});
    if let Some(name) = &display_name {
        metadata["display_name"] = serde_json::json!(name);
    }
    if let Some(avatar) = &avatar_url {
        metadata["avatar_url"] = serde_json::json!(avatar);
    }
    if let Some(banner) = &banner_url {
        metadata["banner_url"] = serde_json::json!(banner);
    }

    let user = state.supabase.update_user_metadata(&token, metadata).await
        .map_err(|e| AppError::CommandFailed(e))?;

    // Update local session with new user info
    state.session.update_user(&user);
    log::info!("Profile updated for user: {}", user.id);

    Ok(user)
}

pub struct AuthState {
    pub supabase: SupabaseClient,
    pub session: SessionManager,
}

impl AuthState {
    /// Returns a valid access token, refreshing if expired.
    /// This is used by all commands that need an authenticated request.
    pub async fn ensure_valid_token(&self) -> Result<String, AppError> {
        // Try current token first
        if let Some(token) = self.session.get_token() {
            return Ok(token);
        }

        // Access token expired — try refresh
        if let Some(refresh) = self.session.get_refresh_token() {
            match self.supabase.refresh_token(&refresh).await {
                Ok(response) => {
                    self.session.save_session(&response);
                    log::info!("Token refreshed successfully via ensure_valid_token");
                    Ok(response.access_token)
                }
                Err(e) => {
                    log::warn!("Token refresh failed in ensure_valid_token: {}", e);
                    self.session.clear_session();
                    Err(AppError::CommandFailed("Session expired. Please log in again.".to_string()))
                }
            }
        } else {
            Err(AppError::CommandFailed("Not authenticated".to_string()))
        }
    }
}

#[tauri::command]
pub async fn register(
    email: String,
    password: String,
    username: Option<String>,
    state: State<'_, AuthState>,
) -> Result<AuthResponse, AppError> {
    log::info!("Register attempt: {}", email);

    let response = state
        .supabase
        .sign_up(&email, &password, username.as_deref())
        .await
        .map_err(|e| AppError::CommandFailed(e))?;

    // Only save session if we got valid tokens
    if !response.access_token.is_empty() {
        state.session.save_session(&response);
        log::info!("Register successful: {}", email);
    } else {
        log::warn!("Register returned empty tokens for {} (email confirmation may be pending)", email);
    }

    Ok(response)
}

#[tauri::command]
pub async fn login(
    email: String,
    password: String,
    state: State<'_, AuthState>,
) -> Result<AuthResponse, AppError> {
    log::info!("Login attempt: {}", email);

    let response = state
        .supabase
        .sign_in(&email, &password)
        .await
        .map_err(|e| AppError::CommandFailed(e))?;

    // Only save session if we got valid tokens
    if !response.access_token.is_empty() {
        state.session.save_session(&response);
        log::info!("Login successful: {}", email);
    } else {
        log::warn!("Login returned empty tokens for {}", email);
    }

    Ok(response)
}

#[tauri::command]
pub async fn logout(state: State<'_, AuthState>) -> Result<(), AppError> {
    if let Some(token) = state.session.get_token() {
        let _ = state.supabase.sign_out(&token).await;
    }
    state.session.clear_session();
    log::info!("Logged out");
    Ok(())
}

#[tauri::command]
pub async fn get_current_user(state: State<'_, AuthState>) -> Result<Option<UserInfo>, AppError> {
    // Try to refresh token if expired
    if let Some(refresh) = state.session.get_refresh_token() {
        if state.session.get_token().is_none() {
            match state.supabase.refresh_token(&refresh).await {
                Ok(response) => {
                    state.session.save_session(&response);
                    log::info!("Token refreshed successfully");
                }
                Err(e) => {
                    log::warn!("Token refresh failed: {}", e);
                    state.session.clear_session();
                    return Ok(None);
                }
            }
        }
    }

    Ok(state.session.get_user())
}

#[tauri::command]
pub async fn check_auth(state: State<'_, AuthState>) -> Result<bool, AppError> {
    Ok(state.session.is_authenticated())
}
