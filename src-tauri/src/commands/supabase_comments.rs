use tauri::State;

use crate::auth::supabase::{Comment, Rating, RatingStats};
use crate::commands::auth::AuthState;
use crate::errors::AppError;

// ── Comments ──────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn sb_get_comments(
    package_id: String,
    state: State<'_, AuthState>,
) -> Result<Vec<Comment>, AppError> {
    let token = state.session.get_token();
    state
        .supabase
        .get_comments(&package_id, token.as_deref())
        .await
        .map_err(|e| AppError::CommandFailed(e))
}

#[tauri::command]
pub async fn sb_add_comment(
    package_id: String,
    content: String,
    state: State<'_, AuthState>,
) -> Result<Comment, AppError> {
    let user = state
        .session
        .get_user()
        .ok_or_else(|| AppError::CommandFailed("Not authenticated".to_string()))?;
    let token = state.ensure_valid_token().await?;

    let user_name = user
        .display_name
        .as_deref()
        .or(user.username.as_deref())
        .unwrap_or("Anonymous");

    state
        .supabase
        .add_comment(
            &package_id,
            &user.id,
            user_name,
            user.avatar_url.as_deref(),
            user.banner_url.as_deref(),
            &content,
            &token,
        )
        .await
        .map_err(|e| AppError::CommandFailed(e))
}

#[tauri::command]
pub async fn sb_update_comment(
    comment_id: String,
    content: String,
    state: State<'_, AuthState>,
) -> Result<Comment, AppError> {
    let token = state.ensure_valid_token().await?;

    state
        .supabase
        .update_comment(&comment_id, &content, &token)
        .await
        .map_err(|e| AppError::CommandFailed(e))
}

#[tauri::command]
pub async fn sb_delete_comment(
    comment_id: String,
    state: State<'_, AuthState>,
) -> Result<(), AppError> {
    let token = state.ensure_valid_token().await?;

    state
        .supabase
        .delete_comment(&comment_id, &token)
        .await
        .map_err(|e| AppError::CommandFailed(e))
}

// ── Ratings ───────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn sb_get_user_rating(
    package_id: String,
    state: State<'_, AuthState>,
) -> Result<Option<Rating>, AppError> {
    let user = state.session.get_user();
    let token = state.session.get_token();

    if let Some(user) = user {
        state
            .supabase
            .get_user_rating(&package_id, &user.id, token.as_deref())
            .await
            .map_err(|e| AppError::CommandFailed(e))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn sb_get_rating_stats(
    package_id: String,
    state: State<'_, AuthState>,
) -> Result<RatingStats, AppError> {
    let token = state.session.get_token();
    state
        .supabase
        .get_rating_stats(&package_id, token.as_deref())
        .await
        .map_err(|e| AppError::CommandFailed(e))
}

#[tauri::command]
pub async fn sb_set_rating(
    package_id: String,
    score: i32,
    state: State<'_, AuthState>,
) -> Result<Rating, AppError> {
    let user = state
        .session
        .get_user()
        .ok_or_else(|| AppError::CommandFailed("Not authenticated".to_string()))?;
    let token = state.ensure_valid_token().await?;

    state
        .supabase
        .set_rating(&package_id, &user.id, score, &token)
        .await
        .map_err(|e| AppError::CommandFailed(e))
}
