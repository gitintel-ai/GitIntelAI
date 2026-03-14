# GitIntel AI — Windows installer (PowerShell)
# https://github.com/gitintel-ai/GitIntelAI
#
# Usage:
#   irm https://gitintel.com/install.ps1 | iex
#   irm https://raw.githubusercontent.com/gitintel-ai/GitIntelAI/main/install.ps1 | iex
#
# Options (env vars):
#   $env:GITINTEL_INSTALL_DIR  — destination directory (default: $env:LOCALAPPDATA\gitintel\bin)
#   $env:GITINTEL_VERSION      — pin a specific release tag  (default: latest)

$ErrorActionPreference = 'Stop'

$Repo       = 'gitintel-ai/GitIntelAI'
$BinName    = 'gitintel.exe'
$InstallDir = if ($env:GITINTEL_INSTALL_DIR) { $env:GITINTEL_INSTALL_DIR } else { "$env:LOCALAPPDATA\gitintel\bin" }

# ── Detect architecture ────────────────────────────────────────────────────────
$Arch = if ([System.Environment]::Is64BitOperatingSystem) { 'amd64' } else {
    Write-Error "Only 64-bit Windows is supported. Please build from source."
    exit 1
}

$Artifact = "gitintel-windows-$Arch.exe"

# ── Resolve version ────────────────────────────────────────────────────────────
if ($env:GITINTEL_VERSION) {
    $Version = $env:GITINTEL_VERSION
} else {
    Write-Host "Fetching latest release..." -NoNewline
    try {
        $Release = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ 'User-Agent' = 'gitintel-installer' }
        $Version = $Release.tag_name
        Write-Host " $Version"
    } catch {
        Write-Error "Could not determine latest version: $_`nCheck https://github.com/$Repo/releases"
        exit 1
    }
}

$DownloadUrl = "https://github.com/$Repo/releases/download/$Version/$Artifact"

# ── Download ───────────────────────────────────────────────────────────────────
Write-Host "Downloading gitintel $Version for windows/$Arch..."

$TmpFile = [System.IO.Path]::GetTempFileName() + '.exe'
try {
    Invoke-WebRequest $DownloadUrl -OutFile $TmpFile -UseBasicParsing
} catch {
    Write-Error "Download failed: $_`nURL: $DownloadUrl`nCheck https://github.com/$Repo/releases"
    exit 1
}

# ── Install ────────────────────────────────────────────────────────────────────
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$Dest = Join-Path $InstallDir $BinName
Move-Item -Force $TmpFile $Dest

Write-Host ""
Write-Host "  v  Installed: $Dest  ($Version)" -ForegroundColor Green

# ── PATH check ─────────────────────────────────────────────────────────────────
$UserPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
if ($UserPath -notlike "*$InstallDir*") {
    Write-Host ""
    Write-Host "  ! $InstallDir is not in your PATH." -ForegroundColor Yellow
    Write-Host "    Adding it now..."
    [System.Environment]::SetEnvironmentVariable('Path', "$UserPath;$InstallDir", 'User')
    $env:Path += ";$InstallDir"
    Write-Host "  v  Added to PATH (restart your terminal to take effect)" -ForegroundColor Green
}

# ── Done ───────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Run 'gitintel --version' to verify."
Write-Host "  Run 'gitintel init' inside a git repo to get started."
Write-Host "  Docs: https://gitintel.com/docs/getting-started"
Write-Host ""
