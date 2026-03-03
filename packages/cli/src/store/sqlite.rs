//! SQLite database operations for GitIntel

use crate::config::get_db_path;
use crate::error::{GitIntelError, Result};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Database handle
pub struct Database {
    conn: Connection,
}

/// Checkpoint record - stores pending AI attribution before commit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checkpoint {
    pub id: String,
    pub session_id: String,
    pub agent: String,
    pub model: String,
    pub file_path: String,
    pub line_start: i32,
    pub line_end: i32,
    pub timestamp: DateTime<Utc>,
    pub tokens_in: i64,
    pub tokens_out: i64,
    pub tokens_cache_read: i64,
    pub tokens_cache_write: i64,
    pub cost_usd: f64,
    pub transcript_ref: Option<String>,
}

/// Attribution record - committed AI/human line attribution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attribution {
    pub commit_sha: String,
    pub repo_path: String,
    pub author_email: String,
    pub authored_at: DateTime<Utc>,
    pub ai_lines: i32,
    pub human_lines: i32,
    pub total_lines: i32,
    pub ai_pct: f64,
    pub total_cost_usd: f64,
    pub log_json: String,
}

/// Cost session record - OTel session data linked to commits
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostSession {
    pub session_id: String,
    pub commit_sha: Option<String>,
    pub agent: String,
    pub model: String,
    pub project_path: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub tokens_in: i64,
    pub tokens_out: i64,
    pub tokens_cache: i64,
    pub cost_usd: f64,
}

/// Memory record - key-value facts about the codebase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memory {
    pub key: String,
    pub value: String,
    pub category: String,
    pub token_count: i32,
    pub last_used_at: DateTime<Utc>,
    pub use_count: i32,
    pub created_at: DateTime<Utc>,
}

impl Database {
    /// Open the database (creates if not exists)
    pub fn open() -> Result<Self> {
        let db_path = get_db_path()?;
        Self::open_at(&db_path)
    }

    /// Open database at a specific path
    pub fn open_at(path: &Path) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(path)?;
        let db = Database { conn };
        db.migrate()?;
        Ok(db)
    }

    /// Run database migrations
    fn migrate(&self) -> Result<()> {
        self.conn.execute_batch(
            r#"
            -- Checkpoint buffer (pre-commit)
            CREATE TABLE IF NOT EXISTS checkpoints (
                id              TEXT PRIMARY KEY,
                session_id      TEXT NOT NULL,
                agent           TEXT NOT NULL,
                model           TEXT NOT NULL,
                file_path       TEXT NOT NULL,
                line_start      INTEGER NOT NULL,
                line_end        INTEGER NOT NULL,
                timestamp       TEXT NOT NULL,
                tokens_in       INTEGER DEFAULT 0,
                tokens_out      INTEGER DEFAULT 0,
                tokens_cache_read INTEGER DEFAULT 0,
                tokens_cache_write INTEGER DEFAULT 0,
                cost_usd        REAL DEFAULT 0.0,
                transcript_ref  TEXT
            );

            -- Committed attribution logs
            CREATE TABLE IF NOT EXISTS attributions (
                commit_sha      TEXT PRIMARY KEY,
                repo_path       TEXT NOT NULL,
                author_email    TEXT NOT NULL,
                authored_at     TEXT NOT NULL,
                ai_lines        INTEGER DEFAULT 0,
                human_lines     INTEGER DEFAULT 0,
                total_lines     INTEGER DEFAULT 0,
                ai_pct          REAL DEFAULT 0.0,
                total_cost_usd  REAL DEFAULT 0.0,
                log_json        TEXT NOT NULL
            );

            -- Cost sessions
            CREATE TABLE IF NOT EXISTS cost_sessions (
                session_id      TEXT PRIMARY KEY,
                commit_sha      TEXT,
                agent           TEXT NOT NULL,
                model           TEXT NOT NULL,
                project_path    TEXT NOT NULL,
                started_at      TEXT NOT NULL,
                ended_at        TEXT,
                tokens_in       INTEGER DEFAULT 0,
                tokens_out      INTEGER DEFAULT 0,
                tokens_cache    INTEGER DEFAULT 0,
                cost_usd        REAL DEFAULT 0.0
            );

            -- Memory store
            CREATE TABLE IF NOT EXISTS memory (
                key             TEXT PRIMARY KEY,
                value           TEXT NOT NULL,
                category        TEXT DEFAULT 'general',
                token_count     INTEGER DEFAULT 0,
                last_used_at    TEXT NOT NULL,
                use_count       INTEGER DEFAULT 0,
                created_at      TEXT NOT NULL
            );

            -- Sync metadata
            CREATE TABLE IF NOT EXISTS sync_metadata (
                key             TEXT PRIMARY KEY,
                value           TEXT NOT NULL
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON checkpoints(session_id);
            CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp);
            CREATE INDEX IF NOT EXISTS idx_attributions_author ON attributions(author_email);
            CREATE INDEX IF NOT EXISTS idx_attributions_date ON attributions(authored_at);
            CREATE INDEX IF NOT EXISTS idx_cost_sessions_commit ON cost_sessions(commit_sha);
            CREATE INDEX IF NOT EXISTS idx_cost_sessions_started ON cost_sessions(started_at);
            CREATE INDEX IF NOT EXISTS idx_memory_category ON memory(category);
            CREATE INDEX IF NOT EXISTS idx_memory_last_used ON memory(last_used_at);
            "#,
        )?;

        Ok(())
    }

    // ==================== Checkpoint Operations ====================

    /// Insert a new checkpoint
    pub fn insert_checkpoint(&self, cp: &Checkpoint) -> Result<()> {
        self.conn.execute(
            r#"
            INSERT INTO checkpoints (
                id, session_id, agent, model, file_path, line_start, line_end,
                timestamp, tokens_in, tokens_out, tokens_cache_read, tokens_cache_write,
                cost_usd, transcript_ref
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
            "#,
            params![
                cp.id,
                cp.session_id,
                cp.agent,
                cp.model,
                cp.file_path,
                cp.line_start,
                cp.line_end,
                cp.timestamp.to_rfc3339(),
                cp.tokens_in,
                cp.tokens_out,
                cp.tokens_cache_read,
                cp.tokens_cache_write,
                cp.cost_usd,
                cp.transcript_ref,
            ],
        )?;
        Ok(())
    }

    /// Get all pending checkpoints (since last commit)
    pub fn get_pending_checkpoints(&self) -> Result<Vec<Checkpoint>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM checkpoints ORDER BY timestamp ASC",
        )?;

        let checkpoints = stmt
            .query_map([], |row| {
                Ok(Checkpoint {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    agent: row.get(2)?,
                    model: row.get(3)?,
                    file_path: row.get(4)?,
                    line_start: row.get(5)?,
                    line_end: row.get(6)?,
                    timestamp: DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                    tokens_in: row.get(8)?,
                    tokens_out: row.get(9)?,
                    tokens_cache_read: row.get(10)?,
                    tokens_cache_write: row.get(11)?,
                    cost_usd: row.get(12)?,
                    transcript_ref: row.get(13)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(checkpoints)
    }

    /// Clear all checkpoints (after commit)
    pub fn clear_checkpoints(&self) -> Result<()> {
        self.conn.execute("DELETE FROM checkpoints", [])?;
        Ok(())
    }

    // ==================== Attribution Operations ====================

    /// Insert an attribution record
    pub fn insert_attribution(&self, attr: &Attribution) -> Result<()> {
        self.conn.execute(
            r#"
            INSERT OR REPLACE INTO attributions (
                commit_sha, repo_path, author_email, authored_at,
                ai_lines, human_lines, total_lines, ai_pct,
                total_cost_usd, log_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            "#,
            params![
                attr.commit_sha,
                attr.repo_path,
                attr.author_email,
                attr.authored_at.to_rfc3339(),
                attr.ai_lines,
                attr.human_lines,
                attr.total_lines,
                attr.ai_pct,
                attr.total_cost_usd,
                attr.log_json,
            ],
        )?;
        Ok(())
    }

    /// Get attribution for a commit
    pub fn get_attribution(&self, commit_sha: &str) -> Result<Option<Attribution>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM attributions WHERE commit_sha = ?1",
        )?;

        let attr = stmt
            .query_row([commit_sha], |row| {
                Ok(Attribution {
                    commit_sha: row.get(0)?,
                    repo_path: row.get(1)?,
                    author_email: row.get(2)?,
                    authored_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                    ai_lines: row.get(4)?,
                    human_lines: row.get(5)?,
                    total_lines: row.get(6)?,
                    ai_pct: row.get(7)?,
                    total_cost_usd: row.get(8)?,
                    log_json: row.get(9)?,
                })
            })
            .optional()?;

        Ok(attr)
    }

    /// Get attributions for a time period
    pub fn get_attributions_since(&self, since: DateTime<Utc>) -> Result<Vec<Attribution>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM attributions WHERE authored_at >= ?1 ORDER BY authored_at DESC",
        )?;

        let attrs = stmt
            .query_map([since.to_rfc3339()], |row| {
                Ok(Attribution {
                    commit_sha: row.get(0)?,
                    repo_path: row.get(1)?,
                    author_email: row.get(2)?,
                    authored_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                    ai_lines: row.get(4)?,
                    human_lines: row.get(5)?,
                    total_lines: row.get(6)?,
                    ai_pct: row.get(7)?,
                    total_cost_usd: row.get(8)?,
                    log_json: row.get(9)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(attrs)
    }

    /// Get attributions for a developer
    pub fn get_attributions_by_developer(&self, email: &str) -> Result<Vec<Attribution>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM attributions WHERE author_email = ?1 ORDER BY authored_at DESC",
        )?;

        let attrs = stmt
            .query_map([email], |row| {
                Ok(Attribution {
                    commit_sha: row.get(0)?,
                    repo_path: row.get(1)?,
                    author_email: row.get(2)?,
                    authored_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                    ai_lines: row.get(4)?,
                    human_lines: row.get(5)?,
                    total_lines: row.get(6)?,
                    ai_pct: row.get(7)?,
                    total_cost_usd: row.get(8)?,
                    log_json: row.get(9)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(attrs)
    }

    // ==================== Cost Session Operations ====================

    /// Insert or update a cost session
    pub fn upsert_cost_session(&self, session: &CostSession) -> Result<()> {
        self.conn.execute(
            r#"
            INSERT OR REPLACE INTO cost_sessions (
                session_id, commit_sha, agent, model, project_path,
                started_at, ended_at, tokens_in, tokens_out, tokens_cache, cost_usd
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            params![
                session.session_id,
                session.commit_sha,
                session.agent,
                session.model,
                session.project_path,
                session.started_at.to_rfc3339(),
                session.ended_at.map(|dt| dt.to_rfc3339()),
                session.tokens_in,
                session.tokens_out,
                session.tokens_cache,
                session.cost_usd,
            ],
        )?;
        Ok(())
    }

    /// Get cost sessions for a commit
    pub fn get_cost_sessions_for_commit(&self, commit_sha: &str) -> Result<Vec<CostSession>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM cost_sessions WHERE commit_sha = ?1",
        )?;

        let sessions = stmt
            .query_map([commit_sha], |row| {
                Ok(CostSession {
                    session_id: row.get(0)?,
                    commit_sha: row.get(1)?,
                    agent: row.get(2)?,
                    model: row.get(3)?,
                    project_path: row.get(4)?,
                    started_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                    ended_at: row.get::<_, Option<String>>(6)?.and_then(|s| {
                        DateTime::parse_from_rfc3339(&s)
                            .map(|dt| dt.with_timezone(&Utc))
                            .ok()
                    }),
                    tokens_in: row.get(7)?,
                    tokens_out: row.get(8)?,
                    tokens_cache: row.get(9)?,
                    cost_usd: row.get(10)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(sessions)
    }

    // ==================== Memory Operations ====================

    /// Insert or update a memory entry
    pub fn upsert_memory(&self, mem: &Memory) -> Result<()> {
        self.conn.execute(
            r#"
            INSERT OR REPLACE INTO memory (
                key, value, category, token_count, last_used_at, use_count, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                mem.key,
                mem.value,
                mem.category,
                mem.token_count,
                mem.last_used_at.to_rfc3339(),
                mem.use_count,
                mem.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    /// Get a memory entry by key
    pub fn get_memory(&self, key: &str) -> Result<Option<Memory>> {
        let mut stmt = self.conn.prepare("SELECT * FROM memory WHERE key = ?1")?;

        let mem = stmt
            .query_row([key], |row| {
                Ok(Memory {
                    key: row.get(0)?,
                    value: row.get(1)?,
                    category: row.get(2)?,
                    token_count: row.get(3)?,
                    last_used_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                    use_count: row.get(5)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                })
            })
            .optional()?;

        Ok(mem)
    }

    /// List memory entries by category
    pub fn list_memory(&self, category: Option<&str>) -> Result<Vec<Memory>> {
        let sql = match category {
            Some(_) => "SELECT * FROM memory WHERE category = ?1 ORDER BY last_used_at DESC",
            None => "SELECT * FROM memory ORDER BY last_used_at DESC",
        };

        let mut stmt = self.conn.prepare(sql)?;

        let map_row = |row: &rusqlite::Row<'_>| {
            Ok(Memory {
                key: row.get(0)?,
                value: row.get(1)?,
                category: row.get(2)?,
                token_count: row.get(3)?,
                last_used_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                use_count: row.get(5)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
            })
        };

        let mems: Vec<Memory> = if let Some(cat) = category {
            stmt.query_map([cat], map_row)?
                .collect::<std::result::Result<Vec<_>, _>>()?
        } else {
            stmt.query_map([], map_row)?
                .collect::<std::result::Result<Vec<_>, _>>()?
        };

        Ok(mems)
    }

    /// Delete unused memory entries
    pub fn prune_memory(&self, unused_days: u32) -> Result<usize> {
        let cutoff = Utc::now() - chrono::Duration::days(unused_days as i64);
        let deleted = self.conn.execute(
            "DELETE FROM memory WHERE last_used_at < ?1 AND use_count = 0",
            [cutoff.to_rfc3339()],
        )?;
        Ok(deleted)
    }

    /// Get memory statistics
    pub fn memory_stats(&self) -> Result<(i64, i64, i64)> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT
                COUNT(*) as total,
                SUM(token_count) as tokens,
                SUM(CASE WHEN last_used_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as recent
            FROM memory
            "#,
        )?;

        let (total, tokens, recent) = stmt.query_row([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, Option<i64>>(1)?.unwrap_or(0),
                row.get::<_, i64>(2)?,
            ))
        })?;

        Ok((total, tokens, recent))
    }

    /// Update memory usage stats
    pub fn touch_memory(&self, key: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE memory SET last_used_at = ?1, use_count = use_count + 1 WHERE key = ?2",
            params![Utc::now().to_rfc3339(), key],
        )?;
        Ok(())
    }

    /// Delete a memory entry
    pub fn delete_memory(&self, key: &str) -> Result<bool> {
        let deleted = self.conn.execute("DELETE FROM memory WHERE key = ?1", [key])?;
        Ok(deleted > 0)
    }

    // ==================== Sync Operations ====================

    /// Get the last sync timestamp
    pub fn get_last_sync_time(&self) -> Result<Option<DateTime<Utc>>> {
        let mut stmt = self.conn.prepare(
            "SELECT value FROM sync_metadata WHERE key = 'last_sync_time'",
        )?;

        let result: Option<String> = stmt
            .query_row([], |row| row.get(0))
            .optional()?;

        match result {
            Some(s) => {
                let dt = DateTime::parse_from_rfc3339(&s)
                    .map(|dt| dt.with_timezone(&Utc))
                    .ok();
                Ok(dt)
            }
            None => Ok(None),
        }
    }

    /// Set the last sync timestamp
    pub fn set_last_sync_time(&self, time: DateTime<Utc>) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('last_sync_time', ?1)",
            [time.to_rfc3339()],
        )?;
        Ok(())
    }

    /// Link a cost session to a git commit SHA
    pub fn link_session_to_commit(&self, session_id: &str, commit_sha: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE cost_sessions SET commit_sha = ?1, ended_at = ?2 WHERE session_id = ?3",
            rusqlite::params![commit_sha, Utc::now().to_rfc3339(), session_id],
        )?;
        Ok(())
    }

    /// Get cost sessions since a timestamp
    pub fn get_cost_sessions_since(&self, since: DateTime<Utc>) -> Result<Vec<CostSession>> {
        let mut stmt = self.conn.prepare(
            "SELECT * FROM cost_sessions WHERE started_at >= ?1 ORDER BY started_at ASC",
        )?;

        let sessions = stmt
            .query_map([since.to_rfc3339()], |row| {
                Ok(CostSession {
                    session_id: row.get(0)?,
                    commit_sha: row.get(1)?,
                    agent: row.get(2)?,
                    model: row.get(3)?,
                    project_path: row.get(4)?,
                    started_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                    ended_at: row.get::<_, Option<String>>(6)?.and_then(|s| {
                        DateTime::parse_from_rfc3339(&s)
                            .map(|dt| dt.with_timezone(&Utc))
                            .ok()
                    }),
                    tokens_in: row.get(7)?,
                    tokens_out: row.get(8)?,
                    tokens_cache: row.get(9)?,
                    cost_usd: row.get(10)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(sessions)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_database_creation() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let db = Database::open_at(&db_path).unwrap();
        assert!(db_path.exists());
    }

    #[test]
    fn test_checkpoint_crud() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let db = Database::open_at(&db_path).unwrap();

        let cp = Checkpoint {
            id: "test-1".to_string(),
            session_id: "session-1".to_string(),
            agent: "Claude Code".to_string(),
            model: "claude-opus-4-5".to_string(),
            file_path: "src/main.rs".to_string(),
            line_start: 10,
            line_end: 20,
            timestamp: Utc::now(),
            tokens_in: 100,
            tokens_out: 50,
            tokens_cache_read: 0,
            tokens_cache_write: 0,
            cost_usd: 0.01,
            transcript_ref: None,
        };

        db.insert_checkpoint(&cp).unwrap();
        let checkpoints = db.get_pending_checkpoints().unwrap();
        assert_eq!(checkpoints.len(), 1);
        assert_eq!(checkpoints[0].id, "test-1");

        db.clear_checkpoints().unwrap();
        let checkpoints = db.get_pending_checkpoints().unwrap();
        assert!(checkpoints.is_empty());
    }

    #[test]
    fn test_memory_crud() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let db = Database::open_at(&db_path).unwrap();

        let mem = Memory {
            key: "auth-pattern".to_string(),
            value: "JWT middleware in auth.ts".to_string(),
            category: "architecture".to_string(),
            token_count: 10,
            last_used_at: Utc::now(),
            use_count: 0,
            created_at: Utc::now(),
        };

        db.upsert_memory(&mem).unwrap();

        let retrieved = db.get_memory("auth-pattern").unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().value, "JWT middleware in auth.ts");

        let list = db.list_memory(Some("architecture")).unwrap();
        assert_eq!(list.len(), 1);
    }
}
