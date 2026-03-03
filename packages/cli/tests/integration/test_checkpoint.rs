//! Integration tests for `gitintel checkpoint` command

use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::TempDir;
use std::fs;
use std::process::Command as StdCommand;

fn setup_initialized_repo() -> TempDir {
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

    dir
}

#[test]
fn test_checkpoint_records_ai_lines() {
    let repo = setup_initialized_repo();

    // Create a test file
    fs::write(repo.path().join("test.rs"), "fn main() {\n    println!(\"Hello\");\n}\n").unwrap();

    // Record checkpoint
    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "checkpoint",
            "--file", "test.rs",
            "--lines", "1-3",
            "--agent", "Claude Code",
            "--model", "claude-opus-4-5",
        ])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("Checkpoint recorded"));
}

#[test]
fn test_checkpoint_with_session_id() {
    let repo = setup_initialized_repo();

    fs::write(repo.path().join("test.rs"), "fn test() {}\n").unwrap();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "checkpoint",
            "--file", "test.rs",
            "--lines", "1",
            "--agent", "Claude Code",
            "--model", "claude-sonnet-4",
            "--session", "sess_abc123",
        ])
        .current_dir(repo.path())
        .assert()
        .success();
}

#[test]
fn test_checkpoint_with_tokens() {
    let repo = setup_initialized_repo();

    fs::write(repo.path().join("main.py"), "print('hello')\n").unwrap();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "checkpoint",
            "--file", "main.py",
            "--lines", "1",
            "--agent", "Claude Code",
            "--model", "claude-opus-4-5",
            "--tokens-in", "1500",
            "--tokens-out", "800",
        ])
        .current_dir(repo.path())
        .assert()
        .success();
}

#[test]
fn test_checkpoint_invalid_line_range() {
    let repo = setup_initialized_repo();

    fs::write(repo.path().join("test.rs"), "fn test() {}\n").unwrap();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "checkpoint",
            "--file", "test.rs",
            "--lines", "invalid",
            "--agent", "Claude Code",
            "--model", "claude-opus-4-5",
        ])
        .current_dir(repo.path())
        .assert()
        .failure()
        .stderr(predicate::str::contains("Invalid line range"));
}

#[test]
fn test_checkpoint_nonexistent_file() {
    let repo = setup_initialized_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "checkpoint",
            "--file", "nonexistent.rs",
            "--lines", "1-10",
            "--agent", "Claude Code",
            "--model", "claude-opus-4-5",
        ])
        .current_dir(repo.path())
        .assert()
        .failure()
        .stderr(predicate::str::contains("File not found"));
}

#[test]
fn test_checkpoint_multiple_files() {
    let repo = setup_initialized_repo();

    fs::write(repo.path().join("a.rs"), "fn a() {}\n").unwrap();
    fs::write(repo.path().join("b.rs"), "fn b() {}\n").unwrap();

    // Record multiple checkpoints
    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "checkpoint",
            "--file", "a.rs",
            "--lines", "1",
            "--agent", "Claude Code",
            "--model", "claude-opus-4-5",
        ])
        .current_dir(repo.path())
        .assert()
        .success();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "checkpoint",
            "--file", "b.rs",
            "--lines", "1",
            "--agent", "Claude Code",
            "--model", "claude-opus-4-5",
        ])
        .current_dir(repo.path())
        .assert()
        .success();
}

#[test]
fn test_checkpoint_json_input() {
    let repo = setup_initialized_repo();

    fs::write(repo.path().join("test.rs"), "fn main() {}\n").unwrap();

    let json_input = r#"{
        "file": "test.rs",
        "lines": "1",
        "agent": "Claude Code",
        "model": "claude-opus-4-5",
        "tokens_in": 100,
        "tokens_out": 50
    }"#;

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["checkpoint", "--json"])
        .write_stdin(json_input)
        .current_dir(repo.path())
        .assert()
        .success();
}
