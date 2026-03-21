//! Configuration management for GitIntel CLI

use crate::error::{GitIntelError, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Global GitIntel configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Path to the real git binary
    pub git_path: String,

    /// Prompt storage mode (local, cloud, none)
    pub prompt_storage: String,

    /// Cloud sync settings
    pub cloud_sync: CloudSyncConfig,

    /// OpenTelemetry settings
    pub otel: OtelConfig,

    /// Cost tracking settings
    pub cost: CostConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudSyncConfig {
    pub enabled: bool,
    pub endpoint: String,
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OtelConfig {
    pub enabled: bool,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostConfig {
    pub currency: String,
    pub alert_threshold_daily: f64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            git_path: find_git_binary(),
            prompt_storage: "local".to_string(),
            cloud_sync: CloudSyncConfig {
                enabled: false,
                endpoint: "https://app.gitintel.com/api/v1".to_string(),
                api_key: String::new(),
            },
            otel: OtelConfig {
                enabled: true,
                port: 4317,
            },
            cost: CostConfig {
                currency: "USD".to_string(),
                alert_threshold_daily: 10.0,
            },
        }
    }
}

impl Config {
    /// Load configuration from disk
    pub fn load() -> Result<Self> {
        let config_path = get_config_path()?;
        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)?;
            let config: Config = serde_json::from_str(&content)?;
            Ok(config)
        } else {
            Ok(Config::default())
        }
    }

    /// Save configuration to disk
    pub fn save(&self) -> Result<()> {
        let config_path = get_config_path()?;
        if let Some(parent) = config_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(&config_path, content)?;
        Ok(())
    }

    /// Set a configuration value by key path
    pub fn set(&mut self, key: &str, value: &str) -> Result<()> {
        match key {
            "git_path" => self.git_path = value.to_string(),
            "prompt_storage" => self.prompt_storage = value.to_string(),
            "cloud_sync.enabled" => {
                self.cloud_sync.enabled = value.parse().map_err(|_| {
                    GitIntelError::Config(format!("Invalid boolean value: {}", value))
                })?
            }
            "cloud_sync.endpoint" => self.cloud_sync.endpoint = value.to_string(),
            "cloud_sync.api_key" => self.cloud_sync.api_key = value.to_string(),
            "otel.enabled" => {
                self.otel.enabled = value.parse().map_err(|_| {
                    GitIntelError::Config(format!("Invalid boolean value: {}", value))
                })?
            }
            "otel.port" => {
                self.otel.port = value
                    .parse()
                    .map_err(|_| GitIntelError::Config(format!("Invalid port value: {}", value)))?
            }
            "cost.currency" => self.cost.currency = value.to_string(),
            "cost.alert_threshold_daily" => {
                self.cost.alert_threshold_daily = value.parse().map_err(|_| {
                    GitIntelError::Config(format!("Invalid number value: {}", value))
                })?
            }
            _ => {
                return Err(GitIntelError::Config(format!(
                    "Unknown config key: {}",
                    key
                )))
            }
        }
        Ok(())
    }
}

/// Get the GitIntel home directory
pub fn get_gitintel_home() -> Result<PathBuf> {
    let home = dirs::home_dir()
        .ok_or_else(|| GitIntelError::Config("Cannot find home directory".to_string()))?;
    Ok(home.join(".gitintel"))
}

/// Get the configuration file path
pub fn get_config_path() -> Result<PathBuf> {
    Ok(get_gitintel_home()?.join("config.json"))
}

/// Get the database file path
pub fn get_db_path() -> Result<PathBuf> {
    Ok(get_gitintel_home()?.join("gitintel.db"))
}

/// Get the hooks directory path
pub fn get_hooks_path() -> Result<PathBuf> {
    Ok(get_gitintel_home()?.join("hooks"))
}

/// Find the git binary path
fn find_git_binary() -> String {
    // On Windows, check common locations
    #[cfg(windows)]
    {
        let paths = [
            "C:\\Program Files\\Git\\bin\\git.exe",
            "C:\\Program Files (x86)\\Git\\bin\\git.exe",
        ];
        for path in paths {
            if std::path::Path::new(path).exists() {
                return path.to_string();
            }
        }
    }

    // Default to assuming git is in PATH
    "git".to_string()
}

/// CLI command handler
pub async fn run(json: bool, set: Option<&str>) -> Result<()> {
    let mut config = Config::load()?;

    if let Some(set_value) = set {
        let parts: Vec<&str> = set_value.splitn(2, '=').collect();
        if parts.len() != 2 {
            return Err(GitIntelError::Config(
                "Invalid set format. Use: --set key=value".to_string(),
            ));
        }
        config.set(parts[0], parts[1])?;
        config.save()?;
        println!("Configuration updated: {} = {}", parts[0], parts[1]);
        return Ok(());
    }

    if json {
        println!("{}", serde_json::to_string_pretty(&config)?);
    } else {
        println!("GitIntel Configuration");
        println!("======================");
        println!("Git path: {}", config.git_path);
        println!("Prompt storage: {}", config.prompt_storage);
        println!();
        println!("Cloud Sync:");
        println!("  Enabled: {}", config.cloud_sync.enabled);
        println!("  Endpoint: {}", config.cloud_sync.endpoint);
        println!(
            "  API Key: {}",
            if config.cloud_sync.api_key.is_empty() {
                "(not set)"
            } else {
                "(set)"
            }
        );
        println!();
        println!("OpenTelemetry:");
        println!("  Enabled: {}", config.otel.enabled);
        println!("  Port: {}", config.otel.port);
        println!();
        println!("Cost:");
        println!("  Currency: {}", config.cost.currency);
        println!(
            "  Daily alert threshold: ${:.2}",
            config.cost.alert_threshold_daily
        );
    }

    Ok(())
}
