use crate::errors::AppError;
use crate::models::*;
use rusqlite::{params, Connection};
use std::path::Path;
use std::sync::Mutex;

pub struct Cache {
    conn: Mutex<Connection>,
}

impl Cache {
    pub fn new(db_path: &Path) -> Result<Self, AppError> {
        let conn = Connection::open(db_path)?;
        let cache = Cache {
            conn: Mutex::new(conn),
        };
        cache.init()?;
        Ok(cache)
    }

    pub fn init(&self) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS packages (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                source TEXT NOT NULL,
                version TEXT NOT NULL,
                installed_version TEXT,
                size INTEGER,
                icon_url TEXT,
                homepage TEXT,
                license TEXT,
                tags TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS installed_packages (
                package_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                source TEXT NOT NULL,
                version TEXT NOT NULL,
                size INTEGER,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_packages_source ON packages(source);
            CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
            CREATE INDEX IF NOT EXISTS idx_installed_source ON installed_packages(source);

            CREATE TABLE IF NOT EXISTS ratings (
                package_id TEXT NOT NULL,
                score INTEGER NOT NULL CHECK(score >= 0 AND score <= 10),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (package_id)
            );

            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                package_id TEXT NOT NULL,
                author TEXT NOT NULL DEFAULT 'User',
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_comments_package ON comments(package_id);
            ",
        )?;

        Ok(())
    }

    pub fn get_packages(&self, source: &PackageSource) -> Result<Vec<Package>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;

        let mut stmt = conn.prepare(
            "SELECT id, name, description, source, version, installed_version, size, icon_url, homepage, license, tags FROM packages WHERE source = ?1"
        )?;

        let packages = stmt
            .query_map(params![source.to_string()], |row| {
                let tags_json: Option<String> = row.get(10)?;
                let tags: Vec<String> = tags_json
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();

                Ok(Package {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    source: PackageSource::from(row.get::<_, String>(3)?.as_str()),
                    version: row.get(4)?,
                    installed_version: row.get(5)?,
                    size: row.get(6)?,
                    icon_url: row.get(7)?,
                    screenshot_url: None,
                    homepage: row.get(8)?,
                    license: row.get(9)?,
                    tags,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(packages)
    }

    pub fn save_packages(&self, packages: &[Package]) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;

        let mut stmt = conn.prepare(
            "INSERT OR REPLACE INTO packages (id, name, description, source, version, installed_version, size, icon_url, homepage, license, tags, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, CURRENT_TIMESTAMP)"
        )?;

        for pkg in packages {
            let tags_json = serde_json::to_string(&pkg.tags).unwrap_or_else(|_| "[]".to_string());

            stmt.execute(params![
                pkg.id,
                pkg.name,
                pkg.description,
                pkg.source.to_string(),
                pkg.version,
                pkg.installed_version,
                pkg.size,
                pkg.icon_url,
                pkg.homepage,
                pkg.license,
                tags_json
            ])?;
        }

        Ok(())
    }

    pub fn get_installed(&self) -> Result<Vec<InstalledPackage>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;

        let mut stmt = conn.prepare(
            "SELECT package_id, name, source, version, size FROM installed_packages"
        )?;

        let packages = stmt
            .query_map([], |row| {
                Ok(InstalledPackage {
                    package_id: row.get(0)?,
                    name: row.get(1)?,
                    source: PackageSource::from(row.get::<_, String>(2)?.as_str()),
                    version: row.get(3)?,
                    size: row.get(4)?,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(packages)
    }

    pub fn save_installed(&self, packages: &[InstalledPackage]) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;

        conn.execute("DELETE FROM installed_packages", [])?;

        let mut stmt = conn.prepare(
            "INSERT INTO installed_packages (package_id, name, source, version, size, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)"
        )?;

        for pkg in packages {
            stmt.execute(params![
                pkg.package_id,
                pkg.name,
                pkg.source.to_string(),
                pkg.version,
                pkg.size
            ])?;
        }

        Ok(())
    }

    pub fn mark_installed(&self, id: &str, source: &PackageSource, version: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;

        let package_id = format!("{}/{}", source, id);

        conn.execute(
            "INSERT OR REPLACE INTO installed_packages (package_id, name, source, version, updated_at)
             VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)",
            params![package_id, id, source.to_string(), version],
        )?;

        Ok(())
    }

    pub fn mark_uninstalled(&self, id: &str, source: &PackageSource) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;

        let package_id = format!("{}/{}", source, id);

        conn.execute(
            "DELETE FROM installed_packages WHERE package_id = ?1",
            params![package_id],
        )?;

        Ok(())
    }

    pub fn get_config(&self, key: &str) -> Result<Option<String>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;

        let result = conn.query_row(
            "SELECT value FROM config WHERE key = ?1",
            params![key],
            |row| row.get(0),
        );

        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::Sqlite(e)),
        }
    }

    pub fn save_config(&self, key: &str, value: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;

        conn.execute(
            "INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params![key, value],
        )?;

        Ok(())
    }

    pub fn clear(&self) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;

        conn.execute("DELETE FROM packages", [])?;
        conn.execute("DELETE FROM installed_packages", [])?;

        Ok(())
    }

    pub fn get_arcway_installed_packages(&self) -> Result<Vec<Package>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;

        // First try the JOIN, then fall back to installed_packages alone
        let mut stmt = conn.prepare(
            "SELECT i.package_id, i.name, i.source, i.version, i.size,
                    p.description, p.icon_url, p.homepage, p.license, p.tags
             FROM installed_packages i
             LEFT JOIN packages p ON p.id = i.package_id"
        )?;

        let packages = stmt
            .query_map([], |row| {
                let tags_json: Option<String> = row.get(9)?;
                let tags: Vec<String> = tags_json
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();

                let description: Option<String> = row.get(5)?;
                let icon_url: Option<String> = row.get(6)?;

                Ok(Package {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: description.unwrap_or_default(),
                    source: PackageSource::from(row.get::<_, String>(2)?.as_str()),
                    version: row.get(3)?,
                    installed_version: Some(row.get::<_, String>(3)?),
                    size: row.get(4)?,
                    icon_url,
                    screenshot_url: None,
                    homepage: row.get(7)?,
                    license: row.get(8)?,
                    tags,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(packages)
    }

    // ── Ratings ──

    pub fn get_rating(&self, package_id: &str) -> Result<Option<i32>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;
        let result = conn.query_row(
            "SELECT score FROM ratings WHERE package_id = ?1",
            params![package_id],
            |row| row.get(0),
        );
        match result {
            Ok(score) => Ok(Some(score)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::Sqlite(e)),
        }
    }

    pub fn set_rating(&self, package_id: &str, score: i32) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;
        conn.execute(
            "INSERT OR REPLACE INTO ratings (package_id, score, created_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params![package_id, score],
        )?;
        Ok(())
    }

    pub fn get_avg_rating(&self, package_id: &str) -> Result<(f64, i32), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;
        let result = conn.query_row(
            "SELECT COALESCE(AVG(score), 0.0), COUNT(*) FROM ratings WHERE package_id = ?1",
            params![package_id],
            |row| Ok((row.get::<_, f64>(0)?, row.get::<_, i32>(1)?)),
        ).map_err(AppError::Sqlite)?;
        Ok(result)
    }

    // ── Comments ──

    pub fn get_comments(&self, package_id: &str) -> Result<Vec<Comment>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, package_id, author, content, created_at FROM comments WHERE package_id = ?1 ORDER BY created_at DESC"
        )?;

        let comments = stmt
            .query_map(params![package_id], |row| {
                Ok(Comment {
                    id: row.get(0)?,
                    package_id: row.get(1)?,
                    author: row.get(2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(comments)
    }

    pub fn add_comment(&self, package_id: &str, author: &str, content: &str) -> Result<i64, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::TauriError(e.to_string()))?;
        conn.execute(
            "INSERT INTO comments (package_id, author, content, created_at) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)",
            params![package_id, author, content],
        )?;
        Ok(conn.last_insert_rowid())
    }
}
