//! Repository scanner - detects stack, structure, and patterns

use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use walkdir::WalkDir;

/// Detected project information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub name: String,
    pub description: Option<String>,
    pub languages: Vec<String>,
    pub framework: Option<String>,
    pub runtime: Option<String>,
    pub database: Option<String>,
    pub test_framework: Option<String>,
    pub linter: Option<String>,
    pub package_manager: Option<String>,
    pub build_tool: Option<String>,
    pub dependencies: Vec<String>,
    pub structure: DirectoryStructure,
    pub conventions: Conventions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryStructure {
    pub root_dirs: Vec<String>,
    pub src_dir: Option<String>,
    pub test_dir: Option<String>,
    pub entry_points: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conventions {
    pub commit_format: Option<String>,
    pub code_style: Option<String>,
    pub file_naming: Option<String>,
    pub import_style: Option<String>,
}

/// Scan a repository and detect project information
pub fn scan_repo(path: &Path) -> Result<ProjectInfo> {
    let name = path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "project".to_string());

    let mut info = ProjectInfo {
        name,
        description: None,
        languages: Vec::new(),
        framework: None,
        runtime: None,
        database: None,
        test_framework: None,
        linter: None,
        package_manager: None,
        build_tool: None,
        dependencies: Vec::new(),
        structure: DirectoryStructure {
            root_dirs: Vec::new(),
            src_dir: None,
            test_dir: None,
            entry_points: Vec::new(),
        },
        conventions: Conventions {
            commit_format: None,
            code_style: None,
            file_naming: None,
            import_style: None,
        },
    };

    // Detect languages and frameworks from config files
    detect_from_config_files(path, &mut info)?;

    // Scan directory structure
    scan_directory_structure(path, &mut info)?;

    // Detect conventions
    detect_conventions(path, &mut info)?;

    Ok(info)
}

fn detect_from_config_files(path: &Path, info: &mut ProjectInfo) -> Result<()> {
    // Check for package.json (Node.js/JavaScript)
    let package_json = path.join("package.json");
    if package_json.exists() {
        info.languages.push("JavaScript/TypeScript".to_string());
        info.package_manager = Some("npm/bun".to_string());

        if let Ok(content) = std::fs::read_to_string(&package_json) {
            if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
                info.description = pkg["description"].as_str().map(|s| s.to_string());

                // Detect framework
                let deps = pkg.get("dependencies").and_then(|d| d.as_object());
                if let Some(deps) = deps {
                    if deps.contains_key("next") {
                        info.framework = Some("Next.js".to_string());
                    } else if deps.contains_key("react") {
                        info.framework = Some("React".to_string());
                    } else if deps.contains_key("vue") {
                        info.framework = Some("Vue".to_string());
                    } else if deps.contains_key("express") {
                        info.framework = Some("Express".to_string());
                    } else if deps.contains_key("hono") {
                        info.framework = Some("Hono".to_string());
                    }

                    // Detect test framework
                    if deps.contains_key("jest") {
                        info.test_framework = Some("Jest".to_string());
                    } else if deps.contains_key("vitest") {
                        info.test_framework = Some("Vitest".to_string());
                    }

                    // Top dependencies
                    info.dependencies = deps.keys().take(10).map(|k| k.to_string()).collect();
                }
            }
        }
    }

    // Check for Cargo.toml (Rust)
    let cargo_toml = path.join("Cargo.toml");
    if cargo_toml.exists() {
        info.languages.push("Rust".to_string());
        info.build_tool = Some("Cargo".to_string());
        info.test_framework = Some("cargo test".to_string());
    }

    // Check for requirements.txt / pyproject.toml (Python)
    if path.join("requirements.txt").exists() || path.join("pyproject.toml").exists() {
        info.languages.push("Python".to_string());
        info.package_manager = Some("pip/poetry".to_string());

        if path.join("pytest.ini").exists() || path.join("conftest.py").exists() {
            info.test_framework = Some("pytest".to_string());
        }
    }

    // Check for go.mod (Go)
    if path.join("go.mod").exists() {
        info.languages.push("Go".to_string());
        info.build_tool = Some("go build".to_string());
        info.test_framework = Some("go test".to_string());
    }

    // Check for linters
    if path.join(".eslintrc.json").exists() || path.join(".eslintrc.js").exists() {
        info.linter = Some("ESLint".to_string());
    } else if path.join("biome.json").exists() {
        info.linter = Some("Biome".to_string());
    } else if path.join(".prettierrc").exists() {
        info.linter = Some("Prettier".to_string());
    } else if path.join("rustfmt.toml").exists() {
        info.linter = Some("rustfmt".to_string());
    }

    // Check for databases
    if path.join("prisma").exists() {
        info.database = Some("PostgreSQL (Prisma)".to_string());
    } else if path.join("drizzle.config.ts").exists() {
        info.database = Some("PostgreSQL (Drizzle)".to_string());
    }

    Ok(())
}

fn scan_directory_structure(path: &Path, info: &mut ProjectInfo) -> Result<()> {
    // Get top-level directories
    for entry in std::fs::read_dir(path)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            let name = entry.file_name().to_string_lossy().to_string();
            if !name.starts_with('.') && name != "node_modules" && name != "target" {
                info.structure.root_dirs.push(name.clone());

                // Detect common directories
                match name.as_str() {
                    "src" => info.structure.src_dir = Some("src".to_string()),
                    "app" => info.structure.src_dir = Some("app".to_string()),
                    "lib" => info.structure.src_dir = Some("lib".to_string()),
                    "test" | "tests" | "__tests__" => {
                        info.structure.test_dir = Some(name)
                    }
                    _ => {}
                }
            }
        }
    }

    // Find entry points
    let entry_patterns = ["main.rs", "index.ts", "index.js", "main.py", "main.go", "app.ts"];
    for pattern in entry_patterns {
        for entry in WalkDir::new(path).max_depth(3) {
            if let Ok(e) = entry {
                if e.file_name().to_string_lossy() == pattern {
                    let rel_path = e.path().strip_prefix(path).unwrap_or(e.path());
                    info.structure.entry_points.push(rel_path.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(())
}

fn detect_conventions(path: &Path, info: &mut ProjectInfo) -> Result<()> {
    // Check for commitlint
    if path.join(".commitlintrc.json").exists() || path.join("commitlint.config.js").exists() {
        info.conventions.commit_format = Some("Conventional Commits".to_string());
    }

    // Detect file naming from existing files
    // (simplified - would analyze actual file names in production)

    Ok(())
}
