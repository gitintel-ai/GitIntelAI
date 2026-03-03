//! OpenTelemetry collector integration for GitIntel

use crate::config::Config;
use crate::error::Result;
use crate::store::{sqlite::CostSession, Database};
use chrono::Utc;
use tokio::net::TcpListener;

/// Start the local OTel collector
pub async fn start_collector(config: &Config) -> Result<()> {
    if !config.otel.enabled {
        tracing::info!("OTel collector disabled");
        return Ok(());
    }

    let port = config.otel.port;
    tracing::info!("Starting OTel collector on port {}", port);

    // In production, this would use opentelemetry-otlp to receive metrics
    // For now, we'll create a simple TCP listener placeholder

    tokio::spawn(async move {
        if let Ok(listener) = TcpListener::bind(format!("127.0.0.1:{}", port)).await {
            tracing::info!("OTel collector listening on port {}", port);

            loop {
                if let Ok((socket, addr)) = listener.accept().await {
                    tracing::debug!("OTel connection from {}", addr);
                    // Handle OTel protocol here
                    tokio::spawn(handle_otel_connection(socket));
                }
            }
        }
    });

    Ok(())
}

async fn handle_otel_connection(socket: tokio::net::TcpStream) {
    // Parse OTLP/gRPC metrics
    // In production, use tonic and prost for protobuf parsing
    tracing::debug!("Handling OTel connection");
}

/// Process received Claude Code metrics
pub async fn process_claude_code_metrics(
    session_id: &str,
    model: &str,
    tokens_in: i64,
    tokens_out: i64,
    tokens_cache: i64,
    cost_usd: f64,
) -> Result<()> {
    let db = Database::open()?;

    let session = CostSession {
        session_id: session_id.to_string(),
        commit_sha: None, // Will be linked on commit
        agent: "Claude Code".to_string(),
        model: model.to_string(),
        project_path: std::env::current_dir()?.to_string_lossy().to_string(),
        started_at: Utc::now(),
        ended_at: None,
        tokens_in,
        tokens_out,
        tokens_cache,
        cost_usd,
    };

    db.upsert_cost_session(&session)?;

    Ok(())
}

/// Correlate OTel session with git commit
pub async fn correlate_session_to_commit(
    session_id: &str,
    commit_sha: &str,
) -> Result<()> {
    let db = Database::open()?;

    // Update the session with commit SHA using the public method
    db.link_session_to_commit(session_id, commit_sha)?;

    Ok(())
}
