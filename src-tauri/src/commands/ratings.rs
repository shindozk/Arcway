use crate::cache::Cache;
use crate::errors::AppError;
use crate::models::Comment;
use tauri::State;

#[tauri::command]
pub async fn get_rating(
    package_id: String,
    cache: State<'_, Cache>,
) -> Result<Option<i32>, AppError> {
    cache.get_rating(&package_id)
}

#[tauri::command]
pub async fn set_rating(
    package_id: String,
    score: i32,
    cache: State<'_, Cache>,
) -> Result<(), AppError> {
    if score < 0 || score > 10 {
        return Err(AppError::ParseError("Score must be between 0 and 10".to_string()));
    }
    cache.set_rating(&package_id, score)
}

#[tauri::command]
pub async fn get_avg_rating(
    package_id: String,
    cache: State<'_, Cache>,
) -> Result<(f64, i32), AppError> {
    cache.get_avg_rating(&package_id)
}

#[tauri::command]
pub async fn get_comments(
    package_id: String,
    cache: State<'_, Cache>,
) -> Result<Vec<Comment>, AppError> {
    cache.get_comments(&package_id)
}

#[tauri::command]
pub async fn add_comment(
    package_id: String,
    author: String,
    content: String,
    cache: State<'_, Cache>,
) -> Result<i64, AppError> {
    if content.trim().is_empty() {
        return Err(AppError::ParseError("Comment cannot be empty".to_string()));
    }
    let author = if author.trim().is_empty() {
        "Anonymous".to_string()
    } else {
        author
    };
    cache.add_comment(&package_id, &author, &content)
}
