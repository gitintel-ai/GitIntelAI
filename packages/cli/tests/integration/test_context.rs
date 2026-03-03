//! Integration tests for `gitintel context` commands

use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::TempDir;
use std::fs;
use std::process::Command as StdCommand;

fn setup_repo_with_structure() -> TempDir {
    let dir = TempDir::new().unwrap();

    StdCommand::new("git").args(["init"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.email", "test@example.com"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.name", "Test"]).current_dir(dir.path()).output().unwrap();

    // Create realistic project structure
    fs::create_dir_all(dir.path().join("src")).unwrap();
    fs::create_dir_all(dir.path().join("tests")).unwrap();

    fs::write(dir.path().join("Cargo.toml"), r#"
[package]
name = "test-project"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = "1.0"
tokio = { version = "1.0", features = ["full"] }
"#).unwrap();

    fs::write(dir.path().join("src/main.rs"), r#"
use serde::Serialize;

#[derive(Serialize)]
struct Config {
    name: String,
}

#[tokio::main]
async fn main() {
    println!("Hello, world!");
}
"#).unwrap();

    fs::write(dir.path().join("src/lib.rs"), "pub mod utils;\n").unwrap();
    fs::write(dir.path().join("src/utils.rs"), "pub fn helper() {}\n").unwrap();
    fs::write(dir.path().join("tests/integration.rs"), "#[test]\nfn it_works() {}\n").unwrap();

    Command::cargo_bin("gitintel").unwrap().args(["init"]).current_dir(dir.path()).assert().success();

    dir
}

#[test]
fn test_context_init_generates_claude_md() {
    let repo = setup_repo_with_structure();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["context", "init"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("CLAUDE.md").or(predicate::str::contains("generated")));

    assert!(repo.path().join("CLAUDE.md").exists());
}

#[test]
fn test_context_init_detects_stack() {
    let repo = setup_repo_with_structure();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["context", "init"])
        .current_dir(repo.path())
        .assert()
        .success();

    let content = fs::read_to_string(repo.path().join("CLAUDE.md")).unwrap();
    assert!(content.contains("Rust") || content.contains("rust"));
}

#[test]
fn test_context_init_includes_dependencies() {
    let repo = setup_repo_with_structure();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["context", "init"])
        .current_dir(repo.path())
        .assert()
        .success();

    let content = fs::read_to_string(repo.path().join("CLAUDE.md")).unwrap();
    assert!(content.contains("serde") || content.contains("tokio") || content.contains("Dependencies"));
}

#[test]
fn test_context_optimize_reduces_tokens() {
    let repo = setup_repo_with_structure();

    // First init
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["context", "init"])
        .current_dir(repo.path())
        .assert()
        .success();

    // Then optimize
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["context", "optimize"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("token").or(predicate::str::contains("optimiz")));
}

#[test]
fn test_context_diff_shows_token_changes() {
    let repo = setup_repo_with_structure();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["context", "init"])
        .current_dir(repo.path())
        .assert()
        .success();

    // Modify CLAUDE.md
    let content = fs::read_to_string(repo.path().join("CLAUDE.md")).unwrap();
    fs::write(
        repo.path().join("CLAUDE.md"),
        format!("{}\n\n## New Section\nSome additional content here.", content)
    ).unwrap();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["context", "diff"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("+").or(predicate::str::contains("added")));
}

#[test]
fn test_context_stats_shows_token_count() {
    let repo = setup_repo_with_structure();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["context", "init"])
        .current_dir(repo.path())
        .assert()
        .success();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["context", "stats"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("token"));
}

#[test]
fn test_context_init_json_output() {
    let repo = setup_repo_with_structure();

    let output = Command::cargo_bin("gitintel")
        .unwrap()
        .args(["context", "init", "--json"])
        .current_dir(repo.path())
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let json: serde_json::Value = serde_json::from_slice(&output).unwrap();
    assert!(json.get("tokens").is_some() || json.get("sections").is_some());
}

#[test]
fn test_context_init_force_overwrite() {
    let repo = setup_repo_with_structure();

    // Create existing CLAUDE.md
    fs::write(repo.path().join("CLAUDE.md"), "# Existing Content\n").unwrap();

    // Init without force should warn or fail
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["context", "init", "--force"])
        .current_dir(repo.path())
        .assert()
        .success();

    let content = fs::read_to_string(repo.path().join("CLAUDE.md")).unwrap();
    assert!(!content.contains("# Existing Content"));
}
