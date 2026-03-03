//! Integration tests for `gitintel init` command

use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::TempDir;
use std::fs;
use std::process::Command as StdCommand;

/// Helper to create a temporary git repository
fn setup_git_repo() -> TempDir {
    let dir = TempDir::new().unwrap();

    StdCommand::new("git")
        .args(["init"])
        .current_dir(dir.path())
        .output()
        .expect("Failed to init git repo");

    StdCommand::new("git")
        .args(["config", "user.email", "test@example.com"])
        .current_dir(dir.path())
        .output()
        .expect("Failed to set git config");

    StdCommand::new("git")
        .args(["config", "user.name", "Test User"])
        .current_dir(dir.path())
        .output()
        .expect("Failed to set git config");

    dir
}

#[test]
fn test_init_creates_gitintel_directory() {
    let repo = setup_git_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["init"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("GitIntel initialized"));

    // Check .gitintel directory was created
    assert!(repo.path().join(".gitintel").exists());
    assert!(repo.path().join(".gitintel/config.json").exists());
}

#[test]
fn test_init_installs_hooks() {
    let repo = setup_git_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["init"])
        .current_dir(repo.path())
        .assert()
        .success();

    // Check hooks were installed
    let hooks_dir = repo.path().join(".git/hooks");
    assert!(hooks_dir.join("post-commit").exists());
    assert!(hooks_dir.join("pre-commit").exists());
}

#[test]
fn test_init_creates_database() {
    let repo = setup_git_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["init"])
        .current_dir(repo.path())
        .assert()
        .success();

    // Check database was created
    assert!(repo.path().join(".gitintel/gitintel.db").exists());
}

#[test]
fn test_init_fails_outside_git_repo() {
    let dir = TempDir::new().unwrap();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["init"])
        .current_dir(dir.path())
        .assert()
        .failure()
        .stderr(predicate::str::contains("Not a git repository"));
}

#[test]
fn test_init_idempotent() {
    let repo = setup_git_repo();

    // First init
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["init"])
        .current_dir(repo.path())
        .assert()
        .success();

    // Second init should also succeed
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["init"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("already initialized").or(predicate::str::contains("initialized")));
}

#[test]
fn test_init_with_cloud_sync() {
    let repo = setup_git_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["init", "--cloud-sync"])
        .current_dir(repo.path())
        .assert()
        .success();

    // Check config has cloud sync enabled
    let config_path = repo.path().join(".gitintel/config.json");
    let config: serde_json::Value = serde_json::from_str(
        &fs::read_to_string(config_path).unwrap()
    ).unwrap();

    assert_eq!(config["cloud_sync"]["enabled"], true);
}
