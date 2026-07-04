use std::fs;
use std::path::PathBuf;

/// XOR-encrypt data with a key for light obfuscation.
/// Note: This is obfuscation, not cryptographic security.
/// Supabase anon keys are protected by Row Level Security server-side.
fn xor_crypt(data: &[u8], key: &[u8]) -> Vec<u8> {
    data.iter()
        .enumerate()
        .map(|(i, &b)| b ^ key[i % key.len()])
        .collect()
}

/// Build-time encryption key (not machine-specific, so it works on any PC).
const CRYPT_KEY: &[u8] = b"arcway-supabase-embedded-config-v1";

fn main() {
    tauri_build::build();

    // Read .env file from project root (parent of src-tauri)
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let env_path = manifest_dir.join("..").join(".env");

    let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap());

    if let Ok(env_content) = fs::read_to_string(&env_path) {
        let mut url = String::new();
        let mut key = String::new();
        let mut freeimage_key = String::new();

        for line in env_content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((k, v)) = line.split_once('=') {
                let k = k.trim();
                let v = v.trim();
                match k {
                    "SUPABASE_URL" => url = v.to_string(),
                    "SUPABASE_ANON_KEY" => key = v.to_string(),
                    "FREEIMAGE_API_KEY" => freeimage_key = v.to_string(),
                    _ => {}
                }
            }
        }

        // Build JSON manually (no serde_json needed in build.rs)
        let config_json = format!(
            "{{\"url\":\"{}\",\"anon_key\":\"{}\",\"freeimage_api_key\":\"{}\"}}",
            url.replace('\\', "\\\\").replace('"', "\\\""),
            key.replace('\\', "\\\\").replace('"', "\\\""),
            freeimage_key.replace('\\', "\\\\").replace('"', "\\\"")
        );

        // XOR-encrypt the JSON
        let encrypted = xor_crypt(config_json.as_bytes(), CRYPT_KEY);

        // Write encrypted bytes to OUT_DIR (always write, even if empty, so include_bytes! works)
        let out_path = out_dir.join("supabase_config.bin");
        fs::write(&out_path, &encrypted).expect("Failed to write embedded config");

        println!("cargo:rerun-if-changed=../.env");
        if !url.is_empty() && !key.is_empty() {
            println!("cargo:warning=Supabase config embedded and encrypted at compile time");
        } else {
            println!("cargo:warning=SUPABASE_URL or SUPABASE_ANON_KEY missing in .env — auth will not work in release builds");
        }
    } else {
        // Write empty file so include_bytes! doesn't fail
        let out_path = out_dir.join("supabase_config.bin");
        fs::write(&out_path, b"").ok();
        println!("cargo:warning=.env file not found — Supabase config not embedded. Auth will not work in release builds.");
    }
}
