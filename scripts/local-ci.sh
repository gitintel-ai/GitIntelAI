#!/usr/bin/env bash
# Local CI — mirrors .github/workflows/ci.yml.
# GitHub Actions billing is paused, so this is the source of truth.
# Run before every `gh pr create`.
#
# Required (failure aborts + alerts Telegram):
#   - cargo fmt --check                (CLI)
#   - cargo clippy -- -D warnings      (CLI)
#   - cargo test --all-features        (CLI)
#   - bun run type-check               (core)
#   - bun test                         (core)
#
# Advisory (failure prints but does not abort, mirrors GHA continue-on-error):
#   - bun run lint                     (dashboard)
#   - bun run type-check               (dashboard)
#   - bun run build                    (dashboard)
#   - bun run lint                     (server)
#
# Skipped — not feasible locally without extra infra:
#   - Server tests       (needs Postgres service)
#   - Dashboard E2E      (needs Playwright + browsers)
#   - Integration E2E    (needs Postgres + Playwright)
#   - Preview Deploy     (Cloudflare-only)
#   - Docker Build       (needs Docker daemon)
#
# Usage: bash scripts/local-ci.sh
# Exit 0 = green; non-zero = a required step failed.

set -uo pipefail

cd "$(dirname "$0")/.."

red()    { printf "\033[31m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

LOG_DIR=".local-ci-logs"
mkdir -p "$LOG_DIR"

fail=0
advisory_fail=0
failed_steps=()
advisory_failed_steps=()

run_required() {
  local name="$1"; shift
  local log="$LOG_DIR/$(echo "$name" | tr ' /()' '____').log"
  bold ">> $name"
  if "$@" >"$log" 2>&1; then
    green "   PASS — $name"
  else
    red   "   FAIL — $name (log: $log)"
    tail -n 30 "$log" | sed 's/^/     /'
    fail=1
    failed_steps+=("$name")
  fi
  echo
}

run_advisory() {
  local name="$1"; shift
  local log="$LOG_DIR/$(echo "$name" | tr ' /()' '____').log"
  bold ">> $name (advisory)"
  if "$@" >"$log" 2>&1; then
    green "   PASS — $name"
  else
    yellow "   WARN — $name failed but is advisory (log: $log)"
    advisory_fail=1
    advisory_failed_steps+=("$name")
  fi
  echo
}

notify_telegram_failure() {
  local auth=""
  local chat_id="862550511"

  if [[ -f "$HOME/.claude/channels/telegram/.env" ]]; then
    auth=$(awk -F= '$1=="TELEGRAM_BOT_TOKEN"{print $2; exit}' "$HOME/.claude/channels/telegram/.env")
  fi
  if [[ -z "$auth" && -n "${TELEGRAM_BOT_TOKEN:-}" ]]; then
    auth="${TELEGRAM_BOT_TOKEN}"
  fi
  if [[ -z "$auth" ]]; then
    yellow "telegram: no bot credentials — skipping alert"
    return
  fi

  local branch
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  local sha
  sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

  local steps_list=""
  for s in "${failed_steps[@]}"; do
    steps_list+="- ${s}"$'\n'
  done

  local body
  body="gitintel local-ci FAIL"$'\n'$'\n'
  body+="branch: ${branch}"$'\n'
  body+="sha: ${sha}"$'\n'$'\n'
  body+="failed (required):"$'\n'
  body+="${steps_list}"
  body+=$'\n'"logs: ${LOG_DIR}/"

  curl -fsS -X POST "https://api.telegram.org/bot${auth}/sendMessage" \
    --data-urlencode "chat_id=${chat_id}" \
    --data-urlencode "text=${body}" \
    >/dev/null 2>&1 \
    && green "telegram: alerted chat ${chat_id}" \
    || yellow "telegram: send failed (network or token)"
}

# ── CLI (Rust) ───────────────────────────────────────────────────────────
run_required "cli fmt"        bash -c 'cd packages/cli && cargo fmt --check'
run_required "cli clippy"     bash -c 'cd packages/cli && cargo clippy -- -D warnings'
run_required "cli test"       bash -c 'cd packages/cli && cargo test --all-features'

# ── Core Library (Bun) ───────────────────────────────────────────────────
run_required "core type-check" bash -c 'cd packages/core && bun run type-check'
run_required "core test"       bash -c 'cd packages/core && bun test'

# ── Dashboard (advisory in GHA via continue-on-error) ────────────────────
run_advisory "dashboard lint"       bash -c 'cd packages/dashboard && bun run lint'
run_advisory "dashboard type-check" bash -c 'cd packages/dashboard && bun run type-check'
run_advisory "dashboard build"      bash -c 'cd packages/dashboard && NEXT_PUBLIC_API_URL=http://localhost:3001 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder bun run build'

# ── Server (advisory: tests need Postgres, lint is the only feasible bit) ─
run_advisory "server lint"          bash -c 'cd packages/server && bun run lint'

if [[ "$fail" -ne 0 ]]; then
  red "local-ci: FAIL — fix above before opening a PR"
  notify_telegram_failure
  exit 1
fi

if [[ "$advisory_fail" -ne 0 ]]; then
  yellow "local-ci: GREEN with advisory warnings — safe to gh pr create"
  yellow "         advisory failures: ${advisory_failed_steps[*]}"
  exit 0
fi

green "local-ci: GREEN — safe to gh pr create"
