//! Integration tests for `gitintel hooks` commands

use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::TempDir;
use std::fs;
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
fn test_hooks_install() {
    let repo = setup_initialized_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["hooks", "install"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("installed").or(predicate::str::contains("Hooks")));

    let hooks_dir = repo.path().join(".git/hooks");
    assert!(hooks_dir.join("post-commit").exists());
    assert!(hooks_dir.join("pre-commit").exists());
}

#[test]
fn test_hooks_uninstall() {
    let repo = setup_initialized_repo();

    // Install first
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["hooks", "install"])
        .current_dir(repo.path())
        .assert()
        .success();

    // Then uninstall
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["hooks", "uninstall"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("removed").or(predicate::str::contains("uninstalled")));
}

#[test]
fn test_hooks_status() {
    let repo = setup_initialized_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["hooks", "status"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("post-commit").or(predicate::str::contains("Hook")));
}

#[test]
fn test_hooks_preserve_existing() {
    let repo = setup_initialized_repo();

    // Create an existing hook
    let hooks_dir = repo.path().join(".git/hooks");
    fs::create_dir_all(&hooks_dir).unwrap();
    fs::write(
        hooks_dir.join("post-commit"),
        "#!/bin/sh\necho 'Existing hook'\n"
    ).unwrap();

    // Install should preserve or chain
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["hooks", "install"])
        .current_dir(repo.path())
        .assert()
        .success();

    let content = fs::read_to_string(hooks_dir.join("post-commit")).unwrap();
    // Should either chain or backup the existing hook
    assert!(content.contains("gitintel") || content.contains("Existing hook"));
}

#[test]
fn test_post_commit_hook_creates_attribution() {
    let repo = setup_initialized_repo();

    // Create and commit a file with checkpoint
    fs::write(repo.path().join("test.rs"), "fn test() {}\n").unwrap();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args([
            "checkpoint",
            "--file", "test.rs",
            "--lines", "1",
            "--agent", "Claude Code",
            "--model", "claude-opus-4-5",
        ])
        .current_dir(repo.path())
        .assert()
        .success();

    StdCommand::new("git")
        .args(["add", "."])
        .current_dir(repo.path())
        .output()
        .unwrap();

    let output = StdCommand::new("git")
        .args(["commit", "-m", "Test commit"])
        .current_dir(repo.path())
        .output()
        .unwrap();

    // The commit should succeed and hook should run
    assert!(output.status.success());
}

#[test]
fn test_hooks_reinstall() {
    let repo = setup_initialized_repo();

    // Install
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["hooks", "install"])
        .current_dir(repo.path())
        .assert()
        .success();

    // Reinstall
    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["hooks", "install", "--force"])
        .current_dir(repo.path())
        .assert()
        .success();
}

#[test]
fn test_hooks_list_available() {
    let repo = setup_initialized_repo();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["hooks", "list"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("post-commit"))
        .stdout(predicate::str::contains("pre-commit"));
}
