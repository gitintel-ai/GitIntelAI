#!/bin/sh
# GitIntel AI — installer
# https://github.com/gitintel-ai/gitintel
#
# Usage:
#   curl -fsSL https://gitintel.com/install | sh
#   curl -fsSL https://raw.githubusercontent.com/gitintel-ai/gitintel/main/install.sh | sh
#
# Options (env vars):
#   GITINTEL_INSTALL_DIR  — destination directory (default: ~/.local/bin)
#   GITINTEL_VERSION      — pin a specific release tag  (default: latest)

set -e

REPO="gitintel-ai/gitintel"
BIN_NAME="gitintel"
INSTALL_DIR="${GITINTEL_INSTALL_DIR:-$HOME/.local/bin}"

# ── Detect OS ──────────────────────────────────────────────────────────────────
OS=$(uname -s 2>/dev/null | tr '[:upper:]' '[:lower:]')
case "$OS" in
  linux*)  OS="linux"  ;;
  darwin*) OS="macos"  ;;
  msys*|cygwin*|mingw*)
    echo "Windows detected. Please use the PowerShell installer instead:"
    echo ""
    echo "  irm https://gitintel.com/install.ps1 | iex"
    echo ""
    echo "Or download the binary directly from:"
    echo "  https://github.com/$REPO/releases"
    exit 1
    ;;
  *)
    echo "Unsupported OS: $OS"
    echo "Build from source: https://github.com/$REPO#build-from-source"
    exit 1
    ;;
esac

# ── Detect architecture ────────────────────────────────────────────────────────
ARCH=$(uname -m 2>/dev/null)
case "$ARCH" in
  x86_64|amd64)   ARCH="amd64" ;;
  arm64|aarch64)  ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    echo "Build from source: https://github.com/$REPO#build-from-source"
    exit 1
    ;;
esac

ARTIFACT="${BIN_NAME}-${OS}-${ARCH}"

# ── Resolve version ────────────────────────────────────────────────────────────
if [ -n "$GITINTEL_VERSION" ]; then
  VERSION="$GITINTEL_VERSION"
else
  printf "Fetching latest release... "
  VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    2>/dev/null \
    | grep '"tag_name"' \
    | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')

  if [ -z "$VERSION" ]; then
    echo ""
    echo "Error: Could not determine latest version."
    echo "Check https://github.com/$REPO/releases for available versions."
    echo "To pin a version: GITINTEL_VERSION=v0.1.0 curl -fsSL https://gitintel.com/install | sh"
    exit 1
  fi
  echo "$VERSION"
fi

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/$ARTIFACT"

# ── Download ───────────────────────────────────────────────────────────────────
echo "Downloading gitintel $VERSION for $OS/$ARCH..."

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

if ! curl -fsSL --progress-bar "$DOWNLOAD_URL" -o "$TMP"; then
  echo ""
  echo "Error: Download failed."
  echo "URL: $DOWNLOAD_URL"
  echo ""
  echo "Possible causes:"
  echo "  - Release $VERSION does not exist"
  echo "  - No network connection"
  echo ""
  echo "Check https://github.com/$REPO/releases"
  exit 1
fi

# ── Install ────────────────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"
chmod +x "$TMP"
mv "$TMP" "$INSTALL_DIR/$BIN_NAME"

echo ""
echo "  ✓ Installed: $INSTALL_DIR/$BIN_NAME  ($VERSION)"

# ── PATH check ─────────────────────────────────────────────────────────────────
case ":${PATH}:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    SHELL_NAME=$(basename "${SHELL:-sh}")
    case "$SHELL_NAME" in
      zsh)   RC_FILE="$HOME/.zshrc"  ;;
      fish)  RC_FILE="$HOME/.config/fish/config.fish" ;;
      *)     RC_FILE="$HOME/.bashrc" ;;
    esac
    echo ""
    echo "  ! $INSTALL_DIR is not in your PATH."
    echo "    Add to $RC_FILE:"
    echo ""
    echo "      export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "    Then reload your shell:"
    echo "      source $RC_FILE"
    ;;
esac

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "  Run 'gitintel --version' to verify."
echo "  Run 'gitintel init' inside a git repo to get started."
echo "  Docs: https://gitintel.com/docs/getting-started"
echo ""
