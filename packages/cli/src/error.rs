//! Error types for GitIntel CLI

use thiserror::Error;

#[derive(Error, Debug)]
pub enum GitIntelError {
    #[error("Git error: {0}")]
    Git(#[from] git2::Error),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("YAML error: {0}")]
    Yaml(#[from] serde_yaml::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Not a git repository")]
    NotAGitRepo,

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Invalid line range: {0}")]
    InvalidLineRange(String),

    #[error("Invalid time period: {0}")]
    InvalidTimePeriod(String),

    #[error("{0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, GitIntelError>;
