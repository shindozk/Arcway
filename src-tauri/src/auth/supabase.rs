use reqwest::Client;
use serde::{Deserialize, Serialize};

// ── Comment & Rating models (used by Tauri commands) ──────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    pub id: String,
    pub package_id: String,
    pub user_id: String,
    pub user_name: String,
    #[serde(default)]
    pub user_avatar_url: Option<String>,
    #[serde(default)]
    pub user_banner_url: Option<String>,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rating {
    pub id: String,
    pub package_id: String,
    pub user_id: String,
    pub score: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RatingStats {
    pub average: f64,
    pub count: i64,
    pub distribution: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    #[serde(default)]
    pub username: Option<String>,
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub avatar_url: Option<String>,
    #[serde(default)]
    pub banner_url: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub user: UserInfo,
}

#[derive(Debug, Deserialize, Default)]
struct SupabaseErrorResponse {
    error_description: Option<String>,
    msg: Option<String>,
}

pub struct SupabaseClient {
    url: String,
    anon_key: String,
    client: Client,
}

impl SupabaseClient {
    pub fn new(url: String, anon_key: String) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            url: url.trim_end_matches('/').to_string(),
            anon_key,
            client,
        }
    }

    async fn post(&self, endpoint: &str, body: serde_json::Value) -> Result<serde_json::Value, String> {
        let url = format!("{}{}", self.url, endpoint);
        log::debug!("Supabase POST: {}", url);

        let resp = self.client
            .post(&url)
            .header("apikey", &self.anon_key)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| format!("Read failed: {}", e))?;

        if !status.is_success() {
            let err: SupabaseErrorResponse = serde_json::from_str(&text).unwrap_or_default();
            let msg = err.error_description
                .or(err.msg)
                .unwrap_or_else(|| format!("HTTP {}: {}", status, text));
            log::error!("Supabase error: {}", msg);
            return Err(msg);
        }

        let data: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| format!("Parse error: {}", e))?;
        Ok(data)
    }

    pub async fn sign_up(&self, email: &str, password: &str, username: Option<&str>) -> Result<AuthResponse, String> {
        let mut body = serde_json::json!({
            "email": email,
            "password": password,
        });

        if let Some(name) = username {
            if !name.is_empty() {
                body["data"] = serde_json::json!({ "username": name });
            }
        }

        let data = self.post("/auth/v1/signup", body).await?;

        // Extract fields from user_metadata if present
        let meta = data.get("user_metadata");
        let meta_str = |key: &str| -> Option<String> {
            meta.and_then(|m| m.get(key))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        };

        let user = UserInfo {
            id: data.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            email: data.get("email").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            username: meta_str("username"),
            display_name: meta_str("display_name"),
            avatar_url: meta_str("avatar_url"),
            banner_url: meta_str("banner_url"),
            created_at: data.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        };

        log::info!("Account created for {}", email);

        // Try to sign in to get real tokens (works if email auto-confirm is enabled)
        match self.sign_in(email, password).await {
            Ok(sign_in_response) if !sign_in_response.access_token.is_empty() => {
                log::info!("Auto sign-in successful for {}", email);
                // Merge username from signup into sign_in response
                let mut final_response = sign_in_response;
                if final_response.user.username.is_none() && user.username.is_some() {
                    final_response.user.username = user.username;
                }
                return Ok(final_response);
            }
            _ => {
                // Email confirmation pending — return user with long-lived session
                // so the user appears logged in locally until they confirm email
                log::info!("Email confirmation pending for {}", email);
                Ok(AuthResponse {
                    access_token: String::new(),
                    refresh_token: String::new(),
                    expires_in: 86400 * 365, // 1 year — keeps session valid locally
                    user,
                })
            }
        }
    }

    pub async fn sign_in(&self, email: &str, password: &str) -> Result<AuthResponse, String> {
        let data = self.post("/auth/v1/token?grant_type=password", serde_json::json!({
            "email": email,
            "password": password,
        })).await?;

        // Check if we got tokens
        if let Some(token) = data.get("access_token").and_then(|v| v.as_str()) {
            if !token.is_empty() {
                // Manually parse user to extract user_metadata fields
                let user_data = data.get("user").cloned().unwrap_or_default();
                let meta = user_data.get("user_metadata");
                let meta_str = |key: &str| -> Option<String> {
                    meta.and_then(|m| m.get(key))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                };

                let user = UserInfo {
                    id: user_data.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    email: user_data.get("email").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    username: meta_str("username"),
                    display_name: meta_str("display_name"),
                    avatar_url: meta_str("avatar_url"),
                    banner_url: meta_str("banner_url"),
                    created_at: user_data.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                };

                let response = AuthResponse {
                    access_token: data.get("access_token").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    refresh_token: data.get("refresh_token").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    expires_in: data.get("expires_in").and_then(|v| v.as_i64()).unwrap_or(3600),
                    user,
                };
                log::info!("Sign in successful for {}", email);
                return Ok(response);
            }
        }

        // No tokens — likely email confirmation pending or error
        let error_desc = data.get("error_description")
            .or(data.get("msg"))
            .and_then(|v| v.as_str())
            .unwrap_or("No access token in response");
        
        log::warn!("Sign in failed for {}: {}", email, error_desc);
        Err(error_desc.to_string())
    }

    pub async fn sign_out(&self, access_token: &str) -> Result<(), String> {
        let url = format!("{}/auth/v1/logout", self.url);
        let _ = self.client
            .post(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", format!("Bearer {}", access_token))
            .send()
            .await;

        log::info!("Signed out");
        Ok(())
    }

    pub async fn get_user(&self, access_token: &str) -> Result<UserInfo, String> {
        let url = format!("{}/auth/v1/user", self.url);

        let resp = self.client
            .get(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", format!("Bearer {}", access_token))
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| format!("Read failed: {}", e))?;

        if !status.is_success() {
            return Err(format!("HTTP {}: {}", status, text));
        }

        let data: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| format!("Parse error: {}", e))?;

        let meta = data.get("user_metadata");
        let meta_str = |key: &str| -> Option<String> {
            meta.and_then(|m| m.get(key))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        };

        let user = UserInfo {
            id: data.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            email: data.get("email").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            username: meta_str("username"),
            display_name: meta_str("display_name"),
            avatar_url: meta_str("avatar_url"),
            banner_url: meta_str("banner_url"),
            created_at: data.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        };

        Ok(user)
    }

    pub async fn update_user_metadata(&self, access_token: &str, metadata: serde_json::Value) -> Result<UserInfo, String> {
        let url = format!("{}/auth/v1/user", self.url);

        let resp = self.client
            .put(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({ "data": metadata }))
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| format!("Read failed: {}", e))?;

        if !status.is_success() {
            let err: SupabaseErrorResponse = serde_json::from_str(&text).unwrap_or_default();
            let msg = err.error_description
                .or(err.msg)
                .unwrap_or_else(|| format!("HTTP {}: {}", status, text));
            return Err(msg);
        }

        let data: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| format!("Parse error: {}", e))?;

        let meta = data.get("user_metadata");
        let meta_str = |key: &str| -> Option<String> {
            meta.and_then(|m| m.get(key))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        };

        let user = UserInfo {
            id: data.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            email: data.get("email").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            username: meta_str("username"),
            display_name: meta_str("display_name"),
            avatar_url: meta_str("avatar_url"),
            banner_url: meta_str("banner_url"),
            created_at: data.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        };

        Ok(user)
    }

    pub async fn refresh_token(&self, refresh_token: &str) -> Result<AuthResponse, String> {
        let data = self.post("/auth/v1/token?grant_type=refresh_token", serde_json::json!({
            "refresh_token": refresh_token,
        })).await?;

        // Manually parse user to extract user_metadata fields
        let user_data = data.get("user").cloned().unwrap_or_default();
        let meta = user_data.get("user_metadata");
        let meta_str = |key: &str| -> Option<String> {
            meta.and_then(|m| m.get(key))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        };

        let user = UserInfo {
            id: user_data.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            email: user_data.get("email").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            username: meta_str("username"),
            display_name: meta_str("display_name"),
            avatar_url: meta_str("avatar_url"),
            banner_url: meta_str("banner_url"),
            created_at: user_data.get("created_at").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        };

        let response = AuthResponse {
            access_token: data.get("access_token").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            refresh_token: data.get("refresh_token").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            expires_in: data.get("expires_in").and_then(|v| v.as_i64()).unwrap_or(3600),
            user,
        };

        log::info!("Token refreshed");
        Ok(response)
    }

    // ── Generic REST helpers ──────────────────────────────────────────────

    async fn get(&self, endpoint: &str, access_token: Option<&str>) -> Result<serde_json::Value, String> {
        let url = format!("{}{}", self.url, endpoint);
        log::debug!("Supabase GET: {}", url);

        let mut req = self.client
            .get(&url)
            .header("apikey", &self.anon_key)
            .header("Accept", "application/json");

        if let Some(token) = access_token {
            req = req.header("Authorization", format!("Bearer {}", token));
        }

        let resp = req.send().await.map_err(|e| format!("Request failed: {}", e))?;
        let status = resp.status();
        let text = resp.text().await.map_err(|e| format!("Read failed: {}", e))?;

        if !status.is_success() {
            let err: SupabaseErrorResponse = serde_json::from_str(&text).unwrap_or_default();
            let msg = err.error_description
                .or(err.msg)
                .unwrap_or_else(|| format!("HTTP {}: {}", status, text));
            log::error!("Supabase GET error: {}", msg);
            return Err(msg);
        }

        serde_json::from_str(&text).map_err(|e| format!("Parse error: {}", e))
    }

    async fn patch(&self, endpoint: &str, body: serde_json::Value, access_token: Option<&str>) -> Result<serde_json::Value, String> {
        let url = format!("{}{}", self.url, endpoint);
        log::debug!("Supabase PATCH: {}", url);

        let mut req = self.client
            .patch(&url)
            .header("apikey", &self.anon_key)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .json(&body);

        if let Some(token) = access_token {
            req = req.header("Authorization", format!("Bearer {}", token));
        }

        let resp = req.send().await.map_err(|e| format!("Request failed: {}", e))?;
        let status = resp.status();
        let text = resp.text().await.map_err(|e| format!("Read failed: {}", e))?;

        if !status.is_success() {
            let err: SupabaseErrorResponse = serde_json::from_str(&text).unwrap_or_default();
            let msg = err.error_description
                .or(err.msg)
                .unwrap_or_else(|| format!("HTTP {}: {}", status, text));
            log::error!("Supabase PATCH error: {}", msg);
            return Err(msg);
        }

        serde_json::from_str(&text).map_err(|e| format!("Parse error: {}", e))
    }

    async fn delete(&self, endpoint: &str, access_token: Option<&str>) -> Result<(), String> {
        let url = format!("{}{}", self.url, endpoint);
        log::debug!("Supabase DELETE: {}", url);

        let mut req = self.client
            .delete(&url)
            .header("apikey", &self.anon_key)
            .header("Accept", "application/json");

        if let Some(token) = access_token {
            req = req.header("Authorization", format!("Bearer {}", token));
        }

        let resp = req.send().await.map_err(|e| format!("Request failed: {}", e))?;
        let status = resp.status();
        let text = resp.text().await.map_err(|e| format!("Read failed: {}", e))?;

        if !status.is_success() {
            let err: SupabaseErrorResponse = serde_json::from_str(&text).unwrap_or_default();
            let msg = err.error_description
                .or(err.msg)
                .unwrap_or_else(|| format!("HTTP {}: {}", status, text));
            log::error!("Supabase DELETE error: {}", msg);
            return Err(msg);
        }

        Ok(())
    }

    // ── Comments (PostgREST) ─────────────────────────────────────────────

    pub async fn get_comments(&self, package_id: &str, access_token: Option<&str>) -> Result<Vec<Comment>, String> {
        let endpoint = format!(
            "/rest/v1/comments?package_id=eq.{}&order=created_at.desc&select=*",
            package_id
        );
        let data = self.get(&endpoint, access_token).await?;
        let comments: Vec<Comment> = serde_json::from_value(data)
            .map_err(|e| format!("Failed to parse comments: {}", e))?;
        Ok(comments)
    }

    pub async fn add_comment(
        &self,
        package_id: &str,
        user_id: &str,
        user_name: &str,
        user_avatar_url: Option<&str>,
        user_banner_url: Option<&str>,
        content: &str,
        access_token: &str,
    ) -> Result<Comment, String> {
        let mut body = serde_json::json!({
            "package_id": package_id,
            "user_id": user_id,
            "user_name": user_name,
            "content": content,
        });
        if let Some(avatar) = user_avatar_url {
            body["user_avatar_url"] = serde_json::json!(avatar);
        }
        if let Some(banner) = user_banner_url {
            body["user_banner_url"] = serde_json::json!(banner);
        }

        let url = format!("{}/rest/v1/comments?select=*", self.url);
        let resp = self.client
            .post(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=representation")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| format!("Read failed: {}", e))?;

        if !status.is_success() {
            let err: SupabaseErrorResponse = serde_json::from_str(&text).unwrap_or_default();
            let msg = err.error_description
                .or(err.msg)
                .unwrap_or_else(|| format!("HTTP {}: {}", status, text));
            log::error!("Supabase add_comment error: {}", msg);
            return Err(msg);
        }

        let data: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| format!("Parse error: {}", e))?;

        // PostgREST returns an array
        let comment: Comment = if let Some(arr) = data.as_array() {
            arr.first()
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .ok_or_else(|| "Empty response".to_string())?
        } else {
            serde_json::from_value(data)
                .map_err(|e| format!("Failed to parse comment: {}", e))?
        };
        Ok(comment)
    }

    pub async fn update_comment(&self, comment_id: &str, content: &str, access_token: &str) -> Result<Comment, String> {
        let body = serde_json::json!({
            "content": content,
            "updated_at": chrono::Utc::now().to_rfc3339(),
        });
        let endpoint = format!("/rest/v1/comments?id=eq.{}&select=*", comment_id);
        let data = self.patch(&endpoint, body, Some(access_token)).await?;

        let comment: Comment = if let Some(arr) = data.as_array() {
            arr.first()
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .ok_or_else(|| "Empty response".to_string())?
        } else {
            serde_json::from_value(data)
                .map_err(|e| format!("Failed to parse comment: {}", e))?
        };
        Ok(comment)
    }

    pub async fn delete_comment(&self, comment_id: &str, access_token: &str) -> Result<(), String> {
        let endpoint = format!("/rest/v1/comments?id=eq.{}", comment_id);
        self.delete(&endpoint, Some(access_token)).await
    }

    // ── Ratings (PostgREST) ──────────────────────────────────────────────

    pub async fn get_user_rating(&self, package_id: &str, user_id: &str, access_token: Option<&str>) -> Result<Option<Rating>, String> {
        let endpoint = format!(
            "/rest/v1/ratings?package_id=eq.{}&user_id=eq.{}&select=*",
            package_id, user_id
        );
        let data = self.get(&endpoint, access_token).await?;
        let ratings: Vec<Rating> = serde_json::from_value(data)
            .map_err(|e| format!("Failed to parse ratings: {}", e))?;
        Ok(ratings.into_iter().next())
    }

    pub async fn get_rating_stats(&self, package_id: &str, access_token: Option<&str>) -> Result<RatingStats, String> {
        let endpoint = format!(
            "/rest/v1/ratings?package_id=eq.{}&select=score",
            package_id
        );
        let data = self.get(&endpoint, access_token).await?;

        let scores: Vec<serde_json::Value> = serde_json::from_value(data)
            .map_err(|e| format!("Failed to parse ratings: {}", e))?;

        let count = scores.len() as i64;
        let values: Vec<i64> = scores.iter()
            .filter_map(|s| s.get("score").and_then(|v| v.as_i64()))
            .collect();
        let average = if !values.is_empty() {
            values.iter().sum::<i64>() as f64 / values.len() as f64
        } else {
            0.0
        };
        let mut distribution = vec![0i64; 5];
        for &s in &values {
            if s >= 1 && s <= 5 {
                distribution[(s - 1) as usize] += 1;
            }
        }

        Ok(RatingStats { average, count, distribution })
    }

    pub async fn set_rating(
        &self,
        package_id: &str,
        user_id: &str,
        score: i32,
        access_token: &str,
    ) -> Result<Rating, String> {
        let body = serde_json::json!({
            "package_id": package_id,
            "user_id": user_id,
            "score": score,
        });
        // Use upsert via POST with Prefer header
        let url = format!("{}/rest/v1/ratings?select=*", self.url);
        let resp = self.client
            .post(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .header("Prefer", "resolution=merge-duplicates")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| format!("Read failed: {}", e))?;

        if !status.is_success() {
            let err: SupabaseErrorResponse = serde_json::from_str(&text).unwrap_or_default();
            let msg = err.error_description
                .or(err.msg)
                .unwrap_or_else(|| format!("HTTP {}: {}", status, text));
            log::error!("Supabase set_rating error: {}", msg);
            return Err(msg);
        }

        let data: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| format!("Parse error: {}", e))?;

        let rating: Rating = if let Some(arr) = data.as_array() {
            arr.first()
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .ok_or_else(|| "Empty response".to_string())?
        } else {
            serde_json::from_value(data)
                .map_err(|e| format!("Failed to parse rating: {}", e))?
        };
        Ok(rating)
    }
}
