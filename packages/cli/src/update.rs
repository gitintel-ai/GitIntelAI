//! Self-update for gitintel CLI

use crate::error::Result;
use colored::Colorize;

const REPO: &str = "gitintel-ai/GitIntelAI";
const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

pub async fn run(check_only: bool) -> Result<()> {
    println!("Checking for updates...");
    println!("Current version: {}", CURRENT_VERSION.cyan());

    let client = reqwest::Client::builder()
        .user_agent(format!("gitintel/{}", CURRENT_VERSION))
        .build()
        .map_err(|e| crate::error::GitIntelError::Other(e.to_string()))?;

    let api_url = format!("https://api.github.com/repos/{}/releases/latest", REPO);
    let resp = client
        .get(&api_url)
        .send()
        .await
        .map_err(|e| crate::error::GitIntelError::Other(format!("network error: {}", e)))?;

    if !resp.status().is_success() {
        return Err(crate::error::GitIntelError::Other(format!(
            "GitHub API returned {}",
            resp.status()
        )));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| crate::error::GitIntelError::Other(e.to_string()))?;

    let latest_tag = json
        .get("tag_name")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    let latest = latest_tag.trim_start_matches('v');
    let current = CURRENT_VERSION.trim_start_matches('v');

    if latest == current {
        println!("{} Already up to date ({})", "✓".green(), CURRENT_VERSION.cyan());
        return Ok(());
    }

    println!("Latest version:  {}", latest_tag.green());

    if check_only {
        println!();
        println!(
            "Update available! Run {} to install.",
            "gitintel update".cyan()
        );
        return Ok(());
    }

    // Detect platform and arch
    let (os, arch) = detect_platform()?;
    let artifact = if os == "windows" {
        format!("gitintel-{}-{}.exe", os, arch)
    } else {
        format!("gitintel-{}-{}", os, arch)
    };

    let download_url = format!(
        "https://github.com/{}/releases/download/{}/{}",
        REPO, latest_tag, artifact
    );

    println!("Downloading {}...", artifact.cyan());

    let bytes = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| crate::error::GitIntelError::Other(format!("download failed: {}", e)))?
        .bytes()
        .await
        .map_err(|e| crate::error::GitIntelError::Other(e.to_string()))?;

    // Get path of current binary
    let current_exe = std::env::current_exe()
        .map_err(|e| crate::error::GitIntelError::Other(e.to_string()))?;

    // Write to temp file then atomically replace
    let tmp_path = current_exe.with_extension("tmp");
    std::fs::write(&tmp_path, &bytes)
        .map_err(|e| crate::error::GitIntelError::Other(format!("write failed: {}", e)))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&tmp_path)?.permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&tmp_path, perms)?;
    }

    std::fs::rename(&tmp_path, &current_exe)
        .map_err(|e| crate::error::GitIntelError::Other(format!("replace failed: {}", e)))?;

    println!(
        "{} Updated to {} — run {} to verify",
        "✓".green(),
        latest_tag.green(),
        "gitintel --version".cyan()
    );

    Ok(())
}

fn detect_platform() -> Result<(String, String)> {
    let os = match std::env::consts::OS {
        "linux" => "linux",
        "macos" => "macos",
        "windows" => "windows",
        other => {
            return Err(crate::error::GitIntelError::Other(format!(
                "unsupported OS: {}",
                other
            )))
        }
    };
    let arch = match std::env::consts::ARCH {
        "x86_64" => "amd64",
        "aarch64" => "arm64",
        other => {
            return Err(crate::error::GitIntelError::Other(format!(
                "unsupported arch: {}",
                other
            )))
        }
    };
    Ok((os.to_string(), arch.to_string()))
}
