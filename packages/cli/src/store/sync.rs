//! Cloud sync functionality for GitIntel

use crate::config::Config;
use crate::error::{GitIntelError, Result};
use crate::store::{Attribution, CostSession, Database};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};

/// Sync local data to cloud
pub async fn sync_to_cloud(db: &Database, config: &Config, force: bool) -> Result<SyncResult> {
    if !config.cloud_sync.enabled {
        return Ok(SyncResult {
            attributions_synced: 0,
            cost_sessions_synced: 0,
            errors: vec!["Cloud sync is disabled. Enable with: gitintel config --set cloud_sync.enabled=true".to_string()],
        });
    }

    if config.cloud_sync.api_key.is_empty() {
        return Ok(SyncResult {
            attributions_synced: 0,
            cost_sessions_synced: 0,
            errors: vec!["API key not configured. Set with: gitintel config --set cloud_sync.api_key=<key>".to_string()],
        });
    }

    let client = Client::new();
    let mut result = SyncResult {
        attributions_synced: 0,
        cost_sessions_synced: 0,
        errors: vec![],
    };

    // Get last sync timestamp (or use epoch if force sync)
    let since = if force {
        DateTime::UNIX_EPOCH.with_timezone(&Utc)
    } else {
        db.get_last_sync_time()?.unwrap_or(DateTime::UNIX_EPOCH.with_timezone(&Utc))
    };

    // Sync attributions
    let attributions = db.get_attributions_since(since)?;
    if !attributions.is_empty() {
        match sync_attributions(&client, config, &attributions).await {
            Ok(count) => {
                result.attributions_synced = count;
            }
            Err(e) => {
                result.errors.push(format!("Attribution sync failed: {}", e));
            }
        }
    }

    // Sync cost sessions
    let cost_sessions = db.get_cost_sessions_since(since)?;
    if !cost_sessions.is_empty() {
        match sync_cost_sessions(&client, config, &cost_sessions).await {
            Ok(count) => {
                result.cost_sessions_synced = count;
            }
            Err(e) => {
                result.errors.push(format!("Cost session sync failed: {}", e));
            }
        }
    }

    // Update last sync timestamp if anything was synced
    if result.attributions_synced > 0 || result.cost_sessions_synced > 0 {
        db.set_last_sync_time(Utc::now())?;
    }

    Ok(result)
}

/// Sync attributions to cloud API
async fn sync_attributions(
    client: &Client,
    config: &Config,
    attributions: &[Attribution],
) -> Result<usize> {
    let payload = SyncAttributionsPayload {
        attributions: attributions.to_vec(),
    };

    let response = client
        .post(format!("{}/sync/attribution", config.cloud_sync.endpoint))
        .header("Authorization", format!("Bearer {}", config.cloud_sync.api_key))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| GitIntelError::Sync(format!("HTTP request failed: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(GitIntelError::Sync(format!(
            "API returned {}: {}",
            status, body
        )));
    }

    let result: SyncResponse = response
        .json()
        .await
        .map_err(|e| GitIntelError::Sync(format!("Failed to parse response: {}", e)))?;

    Ok(result.synced)
}

/// Sync cost sessions to cloud API
async fn sync_cost_sessions(
    client: &Client,
    config: &Config,
    sessions: &[CostSession],
) -> Result<usize> {
    let payload = SyncCostSessionsPayload {
        cost_sessions: sessions.to_vec(),
    };

    let response = client
        .post(format!("{}/sync/cost", config.cloud_sync.endpoint))
        .header("Authorization", format!("Bearer {}", config.cloud_sync.api_key))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| GitIntelError::Sync(format!("HTTP request failed: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(GitIntelError::Sync(format!(
            "API returned {}: {}",
            status, body
        )));
    }

    let result: SyncResponse = response
        .json()
        .await
        .map_err(|e| GitIntelError::Sync(format!("Failed to parse response: {}", e)))?;

    Ok(result.synced)
}

#[derive(Debug)]
pub struct SyncResult {
    pub attributions_synced: usize,
    pub cost_sessions_synced: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize)]
struct SyncAttributionsPayload {
    attributions: Vec<Attribution>,
}

#[derive(Debug, Serialize)]
struct SyncCostSessionsPayload {
    cost_sessions: Vec<CostSession>,
}

#[derive(Debug, Deserialize)]
struct SyncResponse {
    synced: usize,
}
