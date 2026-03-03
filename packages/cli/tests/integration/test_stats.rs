//! Integration tests for `gitintel stats` command

use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::TempDir;
use std::fs;
use std::process::Command as StdCommand;

fn setup_repo_with_history() -> TempDir {
    let dir = TempDir::new().unwrap();

    StdCommand::new("git").args(["init"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.email", "alice@example.com"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.name", "Alice"]).current_dir(dir.path()).output().unwrap();

    Command::cargo_bin("gitintel").unwrap().args(["init"]).current_dir(dir.path()).assert().success();

    // Create multiple commits with AI attribution
    for i in 1..=3 {
        let filename = format!("file{}.rs", i);
        fs::write(dir.path().join(&filename), format!("fn func{}() {{}}\n", i)).unwrap();

        Command::cargo_bin("gitintel")
            .unwrap()
            .args([
                "checkpoint", "--file", &filename, "--lines", "1",
                "--agent", "Claude Code", "--model", "claude-opus-4-5",
                "--tokens-in", "100", "--tokens-out", "50",
            ])
            .current_dir(dir.path())
            .assert()
            .success();

        StdCommand::new("git").args(["add", "."]).current_dir(dir.path()).output().unwrap();
        StdCommand::new("git").args(["commit", "-m", &format!("Commit {}", i)]).current_dir(dir.path()).output().unwrap();
    }

    dir
}

#[test]
fn test_stats_shows_repo_summary() {
    let repo = setup_repo_with_history();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["stats"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("AI"))
        .stdout(predicate::str::contains("commits").or(predicate::str::contains("Commits")));
}

#[test]
fn test_stats_with_period() {
    let repo = setup_repo_with_history();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["stats", "--since", "7d"])
        .current_dir(repo.path())
        .assert()
        .success();
}

#[test]
fn test_stats_developer_breakdown() {
    let repo = setup_repo_with_history();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["stats", "--developer"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("alice@example.com").or(predicate::str::contains("Alice")));
}

#[test]
fn test_stats_json_output() {
    let repo = setup_repo_with_history();

    let output = Command::cargo_bin("gitintel")
        .unwrap()
        .args(["stats", "--json"])
        .current_dir(repo.path())
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let json: serde_json::Value = serde_json::from_slice(&output).unwrap();
    assert!(json.get("total_commits").is_some() || json.get("commits").is_some());
}

#[test]
fn test_stats_by_model() {
    let repo = setup_repo_with_history();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["stats", "--by-model"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("claude-opus-4-5").or(predicate::str::contains("opus")));
}

#[test]
fn test_stats_empty_repo() {
    let dir = TempDir::new().unwrap();
    StdCommand::new("git").args(["init"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.email", "test@example.com"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.name", "Test"]).current_dir(dir.path()).output().unwrap();
    Command::cargo_bin("gitintel").unwrap().args(["init"]).current_dir(dir.path()).assert().success();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["stats"])
        .current_dir(dir.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("0").or(predicate::str::contains("No commits")));
}

#[test]
fn test_stats_branch_filter() {
    let repo = setup_repo_with_history();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["stats", "--branch", "main"])
        .current_dir(repo.path())
        .assert()
        .success();
}
