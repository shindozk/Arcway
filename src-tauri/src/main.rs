#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use arcway_lib::auth::config::SupabaseConfig;
use arcway_lib::auth::session::SessionManager;
use arcway_lib::auth::supabase::SupabaseClient;
use arcway_lib::cache::Cache;
use arcway_lib::commands::auth::AuthState;
use arcway_lib::commands::debug::init_logger;
use arcway_lib::commands::*;
use arcway_lib::package_managers::MultiManager;
use std::path::PathBuf;
use tauri::Manager;

fn get_db_path() -> PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("arcway");

    std::fs::create_dir_all(&data_dir).ok();

    data_dir.join("cache.db")
}

fn main() {
    // Fix WebKitGTK GBM buffer allocation failures on some Linux GPU configs
    // (causes white/blank screen in AppImage)
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if let Err(e) = init_logger(app.handle().clone()) {
                eprintln!("Failed to initialize Tauri logger: {}", e);
            }

            log::info!("Starting Arcway v{}", env!("CARGO_PKG_VERSION"));

            let db_path = get_db_path();
            log::info!("Database path: {:?}", db_path);

            let cache = match Cache::new(&db_path) {
                Ok(cache) => {
                    log::info!("Database initialized successfully");
                    cache
                }
                Err(e) => {
                    log::error!("Failed to initialize database: {}", e);
                    panic!("Failed to initialize database: {}", e);
                }
            };

            let manager = MultiManager::new();
            log::info!("Package managers initialized");

            let supabase_config = SupabaseConfig::load();
            if supabase_config.is_configured() {
                log::info!("Supabase config loaded from {}", supabase_config.url);
            } else {
                log::info!("No Supabase config found, auth disabled");
            }

            let supabase = SupabaseClient::new(supabase_config.url.clone(), supabase_config.anon_key.clone());

            let session_path = dirs::data_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("arcway")
                .join("session.json");

            let session = SessionManager::load_from_file(&session_path);
            if session.is_authenticated() {
                log::info!("Session loaded, user is authenticated");
            }

            let auth_state = AuthState { supabase, session };

            app.manage(cache);
            app.manage(manager);
            app.manage(auth_state);

            log::info!("Arcway setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            search_packages,
            get_featured_packages,
            get_screenshots,
            get_package_detail,
            get_flathub_detail,
            get_trending_packages,
            get_recently_updated_packages,
            get_recently_added_packages,
            get_category_packages,
            install_package,
            uninstall_package,
            list_installed,
            list_arcway_installed,
            check_updates,
            check_arcway_updates,
            update_package,
            update_all,
            get_settings,
            save_settings,
            clear_cache,
            register,
            login,
            logout,
            get_current_user,
            check_auth,
            update_profile,
            upload_image,
            arcway_lib::commands::debug::set_sudo_password,
            arcway_lib::commands::debug::has_sudo_password,
            arcway_lib::commands::debug::get_log_path,
            arcway_lib::commands::debug::get_log_content,
            arcway_lib::commands::debug::list_log_files,
            get_rating,
            set_rating,
            get_avg_rating,
            get_comments,
            add_comment,
            sb_get_comments,
            sb_add_comment,
            sb_update_comment,
            sb_delete_comment,
            sb_get_user_rating,
            sb_get_rating_stats,
            sb_set_rating,
            install_appimage,
            uninstall_appimage,
            update_appimage,
            list_appimages,
            pick_and_install_appimage,
            get_appimage_icon,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Arcway");
}
