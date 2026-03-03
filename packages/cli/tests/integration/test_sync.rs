//! Integration tests for `gitintel sync` command

use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::TempDir;
use std::fs;
use std::process::Command as StdCommand;
use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path, header};

fn setup_repo_with_data() -> TempDir {
    let dir = TempDir::new().unwrap();

    StdCommand::new("git").args(["init"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.email", "test@example.com"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.name", "Test"]).current_dir(dir.path()).output().unwrap();

    Command::cargo_bin("gitintel").unwrap().args(["init"]).current_dir(dir.path()).assert().success();

    // Create commits with data
    fs::write(dir.path().join("test.rs"), "fn test() {}\n").unwrap();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "checkpoint", "--file", "test.rs", "--lines", "1",
            "--agent", "Claude Code", "--model", "claude-opus-4-5",
            "--tokens-in", "100", "--tokens-out", "50",
        ])
        .current_dir(dir.path())
        .assert()
        .success();

    StdCommand::new("git").args(["add", "."]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["commit", "-m", "Test"]).current_dir(dir.path()).output().unwrap();

    dir
}

#[test]
fn test_sync_requires_config() {
    let repo = setup_repo_with_data();

    // Without cloud sync enabled, should fail
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["sync"])
        .current_dir(repo.path())
        .assert()
        .success()  // Succeeds but with warning
        .stdout(predicate::str::contains("disabled").or(predicate::str::contains("not enabled")));
}

#[test]
fn test_sync_requires_api_key() {
    let repo = setup_repo_with_data();

    // Enable cloud sync
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["config", "--set", "cloud_sync.enabled=true"])
        .current_dir(repo.path())
        .assert()
        .success();

    // Without API key, should fail
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["sync"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("API key").or(predicate::str::contains("not configured")));
}

#[tokio::test]
async fn test_sync_to_mock_server() {
    let repo = setup_repo_with_data();

    // Start mock server
    let mock_server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/sync/attribution"))
        .and(header("Authorization", "Bearer test-api-key"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "synced": 1
        })))
        .mount(&mock_server)
        .await;

    Mock::given(method("POST"))
        .and(path("/sync/cost"))
        .and(header("Authorization", "Bearer test-api-key"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "synced": 1
        })))
        .mount(&mock_server)
        .await;

    // Configure sync
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["config", "--set", "cloud_sync.enabled=true"])
        .current_dir(repo.path())
        .assert()
        .success();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["config", "--set", &format!("cloud_sync.endpoint={}", mock_server.uri())])
        .current_dir(repo.path())
        .assert()
        .success();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["config", "--set", "cloud_sync.api_key=test-api-key"])
        .current_dir(repo.path())
        .assert()
        .success();

    // Run sync
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["sync"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("synced").or(predicate::str::contains("1")));
}

#[test]
fn test_sync_force_full() {
    let repo = setup_repo_with_data();

    // Configure (but it won't actually sync without a server)
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["config", "--set", "cloud_sync.enabled=true"])
        .current_dir(repo.path())
        .assert()
        .success();

    // Force sync should process all data
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["sync", "--force"])
        .current_dir(repo.path())
        .assert()
        .success();  // May fail to connect but command runs
}

#[test]
fn test_sync_dry_run() {
    let repo = setup_repo_with_data();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["config", "--set", "cloud_sync.enabled=true"])
        .current_dir(repo.path())
        .assert()
        .success();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["sync", "--dry-run"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("would sync").or(predicate::str::contains("dry")));
}

#[test]
fn test_sync_status() {
    let repo = setup_repo_with_data();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["sync", "--status"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("Last sync").or(predicate::str::contains("never")));
}

#[test]
fn test_sync_json_output() {
    let repo = setup_repo_with_data();

    let output = Command::cargo_bin("gitintel")
        .unwrap()
        .args(["sync", "--status", "--json"])
        .current_dir(repo.path())
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let json: serde_json::Value = serde_json::from_slice(&output).unwrap();
    assert!(json.get("enabled").is_some() || json.get("status").is_some());
}
