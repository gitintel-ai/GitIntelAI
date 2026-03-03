//! Integration tests for `gitintel blame` command

use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::TempDir;
use std::fs;
use std::process::Command as StdCommand;

fn setup_repo_with_commits() -> TempDir {
    let dir = TempDir::new().unwrap();

    // Init git repo
    StdCommand::new("git")
        .args(["init"])
        .current_dir(dir.path())
        .output()
        .unwrap();

    StdCommand::new("git")
        .args(["config", "user.email", "test@example.com"])
        .current_dir(dir.path())
        .output()
        .unwrap();

    StdCommand::new("git")
        .args(["config", "user.name", "Test User"])
        .current_dir(dir.path())
        .output()
        .unwrap();

    // Initialize gitintel
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["init"])
        .current_dir(dir.path())
        .assert()
        .success();

    // Create file and commit
    fs::write(
        dir.path().join("main.rs"),
        "fn main() {\n    println!(\"Hello\");\n    println!(\"World\");\n}\n"
    ).unwrap();

    // Record checkpoint for some lines
    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "checkpoint",
            "--file", "main.rs",
            "--lines", "2-3",
            "--agent", "Claude Code",
            "--model", "claude-opus-4-5",
        ])
        .current_dir(dir.path())
        .assert()
        .success();

    StdCommand::new("git")
        .args(["add", "."])
        .current_dir(dir.path())
        .output()
        .unwrap();

    StdCommand::new("git")
        .args(["commit", "-m", "Initial commit"])
        .current_dir(dir.path())
        .output()
        .unwrap();

    dir
}

#[test]
fn test_blame_shows_ai_attribution() {
    let repo = setup_repo_with_commits();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["blame", "main.rs"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("AI").or(predicate::str::contains("Human")));
}

#[test]
fn test_blame_with_line_numbers() {
    let repo = setup_repo_with_commits();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["blame", "main.rs", "-n"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("1:").or(predicate::str::contains("1 ")));
}

#[test]
fn test_blame_json_output() {
    let repo = setup_repo_with_commits();

    let output = Command::cargo_bin("gitintel")
        .unwrap()
        .args(["blame", "main.rs", "--json"])
        .current_dir(repo.path())
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    // Should be valid JSON
    let json: serde_json::Value = serde_json::from_slice(&output).unwrap();
    assert!(json.get("lines").is_some());
}

#[test]
fn test_blame_nonexistent_file() {
    let repo = setup_repo_with_commits();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["blame", "nonexistent.rs"])
        .current_dir(repo.path())
        .assert()
        .failure()
        .stderr(predicate::str::contains("not found").or(predicate::str::contains("No such file")));
}

#[test]
fn test_blame_with_commit_sha() {
    let repo = setup_repo_with_commits();

    // Get the commit SHA
    let output = StdCommand::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(repo.path())
        .output()
        .unwrap();
    let sha = String::from_utf8(output.stdout).unwrap().trim().to_string();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["blame", "main.rs", "--commit", &sha])
        .current_dir(repo.path())
        .assert()
        .success();
}

#[test]
fn test_blame_porcelain_output() {
    let repo = setup_repo_with_commits();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["blame", "main.rs", "--porcelain"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("author ").or(predicate::str::contains("line ")));
}

#[test]
fn test_blame_summary_mode() {
    let repo = setup_repo_with_commits();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["blame", "main.rs", "--summary"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("AI:").or(predicate::str::contains("Human:")))
        .stdout(predicate::str::contains("%"));
}
