use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// XOR key used for build-time encryption (must match build.rs)
const EMBEDDED_CRYPT_KEY: &[u8] = b"arcway-supabase-embedded-config-v1";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupabaseConfig {
    pub url: String,
    pub anon_key: String,
    #[serde(default)]
    pub freeimage_api_key: String,
}

impl Default for SupabaseConfig {
    fn default() -> Self {
        Self {
            url: String::new(),
            anon_key: String::new(),
            freeimage_api_key: String::new(),
        }
    }
}

/// Derive a 32-byte AES key from hostname + username.
/// Uses multiple rounds of FNV-based mixing to produce a deterministic key.
/// Note: This is machine-bound obfuscation, not full cryptographic security.
/// For stronger security, consider storing the key in a system keyring.
fn derive_key() -> [u8; 32] {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "arcway".to_string());
    let username = whoami::username();
    let combined = format!("arcway:{}:{}", hostname, username);

    // FNV-1a hash to create a seed, then expand to 32 bytes
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in combined.bytes() {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }

    let mut key = [0u8; 32];
    for i in 0..32 {
        let seed = hash.wrapping_add(i as u64);
        let mut h = seed;
        h ^= h >> 33;
        h = h.wrapping_mul(0xff51afd7ed558ccd);
        h ^= h >> 33;
        h = h.wrapping_mul(0xc4ceb9fe1a85ec53);
        h ^= h >> 33;
        key[i] = (h & 0xff) as u8;
    }

    key
}

fn encrypt(data: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Cipher init failed: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Prepend nonce (12 bytes) to ciphertext
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

fn decrypt(data: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    if data.len() < 12 {
        return Err("Ciphertext too short".to_string());
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Cipher init failed: {}", e))?;

    let nonce = Nonce::from_slice(&data[..12]);
    let ciphertext = &data[12..];

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed (wrong key or corrupted data): {}", e))
}

/// Decrypt the build-time embedded config blob.
fn decrypt_embedded_config() -> Option<SupabaseConfig> {
    static EMBEDDED: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/supabase_config.bin"));
    if EMBEDDED.is_empty() {
        return None;
    }
    let decrypted: Vec<u8> = EMBEDDED
        .iter()
        .enumerate()
        .map(|(i, &b)| b ^ EMBEDDED_CRYPT_KEY[i % EMBEDDED_CRYPT_KEY.len()])
        .collect();
    serde_json::from_slice::<SupabaseConfig>(&decrypted).ok()
}

impl SupabaseConfig {
    fn config_path() -> PathBuf {
        dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("arcway")
            .join("supabase.enc")
    }

    pub fn load() -> Self {
        // Priority 0: Embedded config (compiled into binary from .env at build time)
        if let Some(config) = decrypt_embedded_config() {
            if config.is_configured() {
                log::info!("Loaded Supabase config from embedded binary");
                return config;
            }
        }

        // Priority 1: Environment variables (from .env file loaded by dotenvy)
        let env_url = std::env::var("SUPABASE_URL").ok();
        let env_key = std::env::var("SUPABASE_ANON_KEY").ok();

        if let (Some(url), Some(key)) = (env_url, env_key) {
            if !url.is_empty() && !key.is_empty() && !url.contains("your-project") {
                log::info!("Loaded Supabase config from environment variables");
                let config = SupabaseConfig { url, anon_key: key, freeimage_api_key: String::new() };
                // Persist to encrypted file for offline use
                let _ = config.save();
                return config;
            }
        }

        // Priority 2: Encrypted config file
        let path = Self::config_path();
        if path.exists() {
            match std::fs::read(&path) {
                Ok(encrypted) => {
                    let key = derive_key();
                    match decrypt(&encrypted, &key) {
                        Ok(decrypted) => {
                            match serde_json::from_slice::<SupabaseConfig>(&decrypted) {
                                Ok(config) => {
                                    if config.is_configured() {
                                        log::info!("Loaded Supabase config from encrypted file");
                                        return config;
                                    }
                                }
                                Err(e) => {
                                    log::warn!("Failed to parse decrypted config: {}", e);
                                }
                            }
                        }
                        Err(e) => {
                            log::warn!("Failed to decrypt config: {}", e);
                        }
                    }
                }
                Err(e) => {
                    log::warn!("Failed to read encrypted config: {}", e);
                }
            }
        }

        log::info!("No Supabase config found, using defaults");
        SupabaseConfig::default()
    }

    pub fn save(&self) -> Result<(), std::io::Error> {
        let path = Self::config_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let json = serde_json::to_vec(self)?;
        let key = derive_key();
        let encrypted = encrypt(&json, &key)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        std::fs::write(path, encrypted)
    }

    pub fn is_configured(&self) -> bool {
        !self.url.is_empty()
            && !self.anon_key.is_empty()
            && !self.url.contains("your-project")
            && !self.url.contains("your-anon-key")
    }

    /// Get FreeImage API key: try embedded config first, then env var.
    pub fn get_freeimage_api_key() -> Option<String> {
        if let Some(config) = decrypt_embedded_config() {
            if !config.freeimage_api_key.is_empty() {
                return Some(config.freeimage_api_key);
            }
        }
        // Fallback to env var
        std::env::var("FREEIMAGE_API_KEY").ok().filter(|k| !k.is_empty())
    }
}
