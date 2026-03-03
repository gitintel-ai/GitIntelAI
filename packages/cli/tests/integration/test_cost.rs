//! Integration tests for `gitintel cost` command

use assert_cmd::Command;
use predicates::prelude::*;
use tempfile::TempDir;
use std::fs;
use std::process::Command as StdCommand;

fn setup_repo_with_costs() -> TempDir {
    let dir = TempDir::new().unwrap();

    StdCommand::new("git").args(["init"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.email", "dev@example.com"]).current_dir(dir.path()).output().unwrap();
    StdCommand::new("git").args(["config", "user.name", "Developer"]).current_dir(dir.path()).output().unwrap();

    Command::cargo_bin("gitintel").unwrap().args(["init"]).current_dir(dir.path()).assert().success();

    // Create commits with varying costs
    let models = [
        ("claude-opus-4-5", 1000, 500),
        ("claude-sonnet-4", 2000, 1000),
        ("gpt-4", 1500, 750),
    ];

    for (i, (model, tokens_in, tokens_out)) in models.iter().enumerate() {
        let filename = format!("file{}.rs", i);
        fs::write(dir.path().join(&filename), "fn test() {}\n").unwrap();

        Command::cargo_bin("gitintel")
            .unwrap()
            .args([
                "checkpoint", "--file", &filename, "--lines", "1",
                "--agent", "Claude Code", "--model", model,
                "--tokens-in", &tokens_in.to_string(),
                "--tokens-out", &tokens_out.to_string(),
            ])
            .current_dir(dir.path())
            .assert()
            .success();

        StdCommand::new("git").args(["add", "."]).current_dir(dir.path()).output().unwrap();
        StdCommand::new("git").args(["commit", "-m", &format!("Commit with {}", model)]).current_dir(dir.path()).output().unwrap();
    }

    dir
}

#[test]
fn test_cost_shows_total() {
    let repo = setup_repo_with_costs();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["cost"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("$").or(predicate::str::contains("USD")));
}

#[test]
fn test_cost_with_period() {
    let repo = setup_repo_with_costs();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["cost", "--since", "30d"])
        .current_dir(repo.path())
        .assert()
        .success();
}

#[test]
fn test_cost_by_commit() {
    let repo = setup_repo_with_costs();

    // Get HEAD SHA
    let output = StdCommand::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(repo.path())
        .output()
        .unwrap();
    let sha = String::from_utf8(output.stdout).unwrap().trim().to_string();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["cost", "--commit", &sha])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("$"));
}

#[test]
fn test_cost_by_developer() {
    let repo = setup_repo_with_costs();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["cost", "--developer", "dev@example.com"])
        .current_dir(repo.path())
        .assert()
        .success();
}

#[test]
fn test_cost_by_model() {
    let repo = setup_repo_with_costs();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["cost", "--by-model"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("claude-opus-4-5").or(predicate::str::contains("opus")))
        .stdout(predicate::str::contains("claude-sonnet-4").or(predicate::str::contains("sonnet")));
}

#[test]
fn test_cost_json_output() {
    let repo = setup_repo_with_costs();

    let output = Command::cargo_bin("gitintel")
        .unwrap()
        .args(["cost", "--json"])
        .current_dir(repo.path())
        .assert()
        .success()
        .get_output()
        .stdout
        .clone();

    let json: serde_json::Value = serde_json::from_slice(&output).unwrap();
    assert!(json.get("total_cost_usd").is_some() || json.get("total").is_some());
}

#[test]
fn test_cost_by_branch() {
    let repo = setup_repo_with_costs();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["cost", "--branch", "main"])
        .current_dir(repo.path())
        .assert()
        .success();
}

#[test]
fn test_cost_summary_format() {
    let repo = setup_repo_with_costs();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["cost", "--summary"])
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("Total"))
        .stdout(predicate::str::contains("tokens").or(predicate::str::contains("Tokens")));
}

#[test]
fn test_cost_empty_range() {
    let repo = setup_repo_with_costs();

    Command::cargo_bin("gitintel")
        .unwrap()
        .args(["cost", "--since", "1s"])  // Very short period
        .current_dir(repo.path())
        .assert()
        .success()
        .stdout(predicate::str::contains("$0").or(predicate::str::contains("No cost")));
}
