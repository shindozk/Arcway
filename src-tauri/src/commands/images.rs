use crate::errors::AppError;
use reqwest::multipart;
use serde::Deserialize;

fn get_freeimage_key() -> Result<String, AppError> {
    std::env::var("FREEIMAGE_API_KEY")
        .map_err(|_| AppError::CommandFailed(
            "FREEIMAGE_API_KEY environment variable not set. \
             Set it in your .env file or environment to enable image uploads.".to_string()
        ))
}

#[derive(Deserialize)]
struct FreeImageResponse {
    image: FreeImageResult,
}

#[derive(Deserialize)]
struct FreeImageResult {
    url: String,
}

#[tauri::command]
pub async fn upload_image(image_data: String, _filename: String) -> Result<String, AppError> {
    let client = reqwest::Client::new();

    let form = multipart::Form::new()
        .text("key", get_freeimage_key()?)
        .text("source", image_data)
        .text("format", "json".to_string())
        .text("action", "upload".to_string());

    let response = client
        .post("https://freeimage.host/api/1/upload")
        .multipart(form)
        .send()
        .await
        .map_err(|e| AppError::CommandFailed(format!("Upload request failed: {}", e)))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| AppError::CommandFailed(format!("Failed to read response: {}", e)))?;

    if !status.is_success() {
        return Err(AppError::CommandFailed(format!(
            "Upload failed with status {}: {}",
            status, body
        )));
    }

    let parsed: FreeImageResponse = serde_json::from_str(&body)
        .map_err(|e| AppError::ParseError(format!("Failed to parse response: {}", e)))?;

    Ok(parsed.image.url)
}
