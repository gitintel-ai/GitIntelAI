//! Integration tests for `gitintel memory` commands

use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::TempDir;
use std::process::Command as StdCommand;

fn setup_initialized_repo() -> TempDir {
    let dir = TempDir::new().unwrap();

    StdCommand::new("git").args(["init"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.email", "test@example.com"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.name", "Test"]).current_dir(dir.path()).output().unwrap();

    Command::cargo_bin("gitintel").unwrap().args(["init"]).current_dir(dir.path()).assert().success();

    dir
}

#[test]
fn test_memory_add() {
    let repo = setup_initialized_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "memory", "add",
            "--key", "auth-pattern",
            "--value", "Use JWT with httpOnly cookies",
            "--category", "architecture",
        ])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("added").or(predicate::str::contains("Memory")));
}

#[test]
fn test_memory_get() {
    let repo = setup_initialized_repo();

    // Add first
    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "memory", "add",
            "--key", "test-key",
            "--value", "test value here",
        ])
        .current_dir(repo.path())
        .assert()
        .success();

    // Get it
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["memory", "get", "test-key"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("test value here"));
}

#[test]
fn test_memory_list() {
    let repo = setup_initialized_repo();

    // Add multiple
    for i in 1..=3 {
        Command::cargo_bin("gitintel")
            .unwrap()
            .args([
                "memory", "add",
                "--key", &format!("key-{}", i),
                "--value", &format!("value {}", i),
            ])
            .current_dir(repo.path())
            .assert()
            .success();
    }

    // List all
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["memory", "list"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("key-1"))
        .stdout(predicate::str::contains("key-2"))
        .stdout(predicate::str::contains("key-3"));
}

#[test]
fn test_memory_list_by_category() {
    let repo = setup_initialized_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "memory", "add",
            "--key", "arch-1",
            "--value", "architecture note",
            "--category", "architecture",
        ])
        .current_dir(repo.path())
        .assert()
        .success();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "memory", "add",
            "--key", "test-1",
            "--value", "testing note",
            "--category", "testing",
        ])
        .current_dir(repo.path())
        .assert()
        .success();

    // List only architecture
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["memory", "list", "--category", "architecture"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("arch-1"))
        .stdout(predicate::str::contains("test-1").not());
}

#[test]
fn test_memory_delete() {
    let repo = setup_initialized_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "memory", "add",
            "--key", "to-delete",
            "--value", "will be deleted",
        ])
        .current_dir(repo.path())
        .assert()
        .success();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["memory", "delete", "to-delete"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("deleted").or(predicate::str::contains("removed")));

    // Verify it's gone
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["memory", "get", "to-delete"])
        .current_dir(repo.path())
        .assert()
        .failure();
}

#[test]
fn test_memory_prune() {
    let repo = setup_initialized_repo();

    // Add some memory
    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "memory", "add",
            "--key", "old-key",
            "--value", "old value",
        ])
        .current_dir(repo.path())
        .assert()
        .success();

    // Prune with 0 days threshold
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["memory", "prune", "--unused-days", "0"])
        .current_dir(repo.path())
        .assert()
        .success();
}

#[test]
fn test_memory_stats() {
    let repo = setup_initialized_repo();

    for i in 1..=5 {
        Command::cargo_bin("gitintel")
            .unwrap()
            .args([
                "memory", "add",
                "--key", &format!("key-{}", i),
                "--value", "Some value content here",
            ])
            .current_dir(repo.path())
            .assert()
            .success();
    }

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["memory", "stats"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("5").or(predicate::str::contains("entries")))
        .stdout(predicate::str::contains("token"));
}

#[test]
fn test_memory_json_output() {
    let repo = setup_initialized_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "memory", "add",
            "--key", "json-test",
            "--value", "test value",
        ])
        .current_dir(repo.path())
        .assert()
        .success();

    let output = Command::cargo_bin("gitintel")
        .unwrap()
        .args(["memory", "list", "--json"])
        .current_dir(repo.path())
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let json: serde_json::Value = serde_json::from_slice(&output).unwrap();
    assert!(json.is_array() || json.get("memories").is_some());
}

#[test]
fn test_memory_export() {
    let repo = setup_initialized_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "memory", "add",
            "--key", "export-test",
            "--value", "export value",
        ])
        .current_dir(repo.path())
        .assert()
        .success();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["memory", "export"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("export-test"));
}
