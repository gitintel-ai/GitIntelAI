# GitIntel v0.1.0 — Pre-Release Checklist

## Release Pipeline Summary

**Trigger:** Pushing a git tag matching `v*.*.*` (e.g., `git tag v0.1.0 && git push origin v0.1.0`)

**Pipeline stages (in order):**
1. **Build** — 5 binaries across 3 platforms (parallel)
2. **Release** — Creates GitHub Release with auto-generated notes, uploads binaries
3. **Homebrew** — Computes SHA256 checksums, patches formula, pushes to `homebrew-tap` repo
4. **npm** — Publishes `@gitintel/cli` package to npmjs.org

---

## 1. GitHub Secrets Required

| Secret | Used by | Purpose |
|--------|---------|---------|
| `HOMEBREW_TAP_DEPLOY_KEY` | `homebrew` job | SSH deploy key to push formula to `gitintel-ai/homebrew-tap` repo. If missing, the job silently skips (graceful). |
| `NPM_TOKEN` | `npm` job | npm access token for publishing `@gitintel/cli`. If missing, publish will fail. |
| *(none — GitHub token)* | `release` job | Uses default `GITHUB_TOKEN` via `softprops/action-gh-release`. Covered by `permissions: contents: write`. |

**Action items:**
- [ ] Create npm access token at https://www.npmjs.com/settings/tokens (type: Automation)
- [ ] Add `NPM_TOKEN` to repo Settings > Secrets and variables > Actions
- [ ] Generate SSH deploy key pair for homebrew-tap repo
- [ ] Add public key as deploy key on `gitintel-ai/homebrew-tap` (with write access)
- [ ] Add private key as `HOMEBREW_TAP_DEPLOY_KEY` secret on this repo

---

## 2. External Services / Repos to Set Up

### npm
- [ ] Create the `@gitintel` npm org at https://www.npmjs.com/org/create (or verify it exists)
- [ ] Ensure the npm account linked to the token has publish access to `@gitintel/cli`
- [ ] Verify the package name `@gitintel/cli` is not already taken

### Homebrew tap
- [ ] Create the repo `gitintel-ai/homebrew-tap` on GitHub (public)
- [ ] Create `Formula/` directory in that repo with an initial placeholder or empty commit
- [ ] Generate and configure the SSH deploy key (see Secrets section above)

### GitHub repo
- [ ] Verify repo `gitintel-ai/GitIntelAI` is public (required for GitHub Releases downloads)
- [ ] Ensure Actions are enabled on the repo
- [ ] Confirm the default `GITHUB_TOKEN` has `contents: write` (it does — set in workflow `permissions`)

---

## 3. Issues Found During Audit

### CRITICAL

1. **postinstall.js references `./package.json` from wrong path.**
   Line 8: `const VERSION = require('./package.json').version;` — this runs from the package root, but the file is `postinstall.js` at root level, so this is correct. OK.

2. **No Windows ARM64 binary built.** The release workflow only builds `x86_64-pc-windows-msvc`. The PowerShell installer detects ARM64 and constructs `gitintel-windows-arm64.exe` but that artifact does not exist. This will fail on ARM64 Windows machines.
   - **Impact:** Low for v0.1.0 (ARM Windows is rare), but install.ps1 will fail on those machines.
   - **Fix:** Either add a Windows ARM64 build target or add a clear error message in install.ps1.

3. **Homebrew formula has placeholder SHAs checked into main.** The CI does `sed -i` to replace them, but only in the workflow's working copy — it pushes the patched version to the homebrew-tap repo. The formula in this repo's `Formula/` directory will always have `PLACEHOLDER_*` values. This is fine as long as users install from the tap, not from this repo's Formula directory directly.

### WARNINGS

4. **No checksum verification in install.sh or install.ps1.** Neither install script verifies SHA256 checksums after download. The CI generates `checksums.sha256` and uploads it to the release, but the install scripts don't use it.
   - **Risk:** Medium — MITM or corrupted downloads go undetected.
   - **Recommendation:** Add optional checksum verification in a future release.

5. **install.sh uses `gitintel.com` domain, install.ps1 uses `gitintel.ai` domain.** Inconsistent URLs:
   - install.sh line 7: `https://gitintel.com/install`
   - install.ps1 line 5: `https://gitintel.ai/install.ps1`
   - npm package.json homepage: `https://gitintel.com`
   - Homebrew formula homepage: `https://gitintel.ai`
   - **Action:** Decide on canonical domain and make consistent.

6. **Cargo.toml `repository` field points to wrong URL.** Line 8: `https://github.com/gitintel-ai/gitintel` (lowercase, no "AI"). Actual repo is `gitintel-ai/GitIntelAI`.
   - **Fix:** Update to `https://github.com/gitintel-ai/GitIntelAI`

7. **npm bin wrapper `gitintel.js` error message references wrong URL.** Line 14: `https://github.com/gitintel-ai/gitintel` (lowercase). Should be `gitintel-ai/GitIntelAI`.

---

## 4. Version Verification

| File | Version | Status |
|------|---------|--------|
| `packages/cli/Cargo.toml` | `0.1.0` | OK |
| `packages/cli-npm/package.json` | `0.1.0` | OK (CI will `npm version` it to match tag anyway) |
| `Formula/gitintel.rb` | `0.1.0` | OK (CI will `sed` it to match tag) |

---

## 5. Install Script Audit

### install.sh (Linux/macOS)
- [x] Correct GitHub Releases URL pattern
- [x] Correct platform detection (linux, macos)
- [x] Correct arch detection (amd64, arm64)
- [x] Correct artifact naming (matches workflow matrix)
- [x] Creates install directory
- [x] Sets executable permission
- [x] PATH check and guidance
- [ ] **Missing:** No checksum verification
- [ ] **Missing:** No `--version` smoke test after install

### install.ps1 (Windows)
- [x] Correct GitHub Releases URL pattern
- [x] Correct arch detection
- [x] Auto-adds to user PATH (nice)
- [x] Correct artifact naming for amd64
- [ ] **Issue:** ARM64 artifact (`gitintel-windows-arm64.exe`) won't exist in the release
- [ ] **Missing:** No checksum verification

### npm postinstall.js
- [x] Correct platform/arch mapping
- [x] Follows HTTPS redirects (GitHub releases redirect to CDN)
- [x] Soft exit on failure (doesn't block `npm install`)
- [x] Skips download if binary already present
- [x] Sets chmod on non-Windows
- [ ] **Missing:** No checksum verification

---

## 6. Binaries Built

| Platform | Artifact Name | Runner | Build method |
|----------|--------------|--------|-------------|
| Linux x86_64 | `gitintel-linux-amd64` | ubuntu-latest | cargo build (musl) |
| Linux ARM64 | `gitintel-linux-arm64` | ubuntu-latest | cross (musl) |
| macOS x86_64 | `gitintel-macos-amd64` | macos-latest | cargo build |
| macOS ARM64 | `gitintel-macos-arm64` | macos-latest | cargo build |
| Windows x86_64 | `gitintel-windows-amd64.exe` | windows-latest | cargo build (msvc) |

---

## 7. Pre-Tag Steps (Do These Before `git tag v0.1.0`)

### Code fixes
- [ ] Fix Cargo.toml `repository` URL: change to `https://github.com/gitintel-ai/GitIntelAI`
- [ ] Fix `bin/gitintel.js` error URL: change to `https://github.com/gitintel-ai/GitIntelAI`
- [ ] Standardize domain: pick `gitintel.ai` or `gitintel.com` and update all references

### Infrastructure
- [ ] Create npm org `@gitintel` and generate automation token
- [ ] Create `gitintel-ai/homebrew-tap` repo with `Formula/` directory
- [ ] Generate SSH deploy key pair and configure (see Secrets section)
- [ ] Add `NPM_TOKEN` secret to GitHub repo
- [ ] Add `HOMEBREW_TAP_DEPLOY_KEY` secret to GitHub repo

### Verification
- [ ] Run `cargo build --release` locally to confirm it compiles
- [ ] Run `cargo test` to confirm tests pass
- [ ] Test the install scripts locally with a test release (optional: create a pre-release first)

---

## 8. Release Execution

```bash
# Ensure you're on main, up to date
git checkout main
git pull origin main

# Tag and push
git tag v0.1.0
git push origin v0.1.0
```

---

## 9. Post-Release Verification

### GitHub Release
- [ ] Release page exists at `https://github.com/gitintel-ai/GitIntelAI/releases/tag/v0.1.0`
- [ ] All 5 binaries are attached
- [ ] `checksums.sha256` is attached
- [ ] Release notes are auto-generated and sensible

### Binary smoke tests
- [ ] **Linux amd64:** Download, `chmod +x`, run `./gitintel-linux-amd64 --version` — outputs `0.1.0`
- [ ] **macOS arm64:** Download, `chmod +x`, run `./gitintel-macos-arm64 --version` — outputs `0.1.0`
- [ ] **Windows amd64:** Download, run `.\gitintel-windows-amd64.exe --version` — outputs `0.1.0`

### Install script tests
- [ ] `curl -fsSL https://raw.githubusercontent.com/gitintel-ai/GitIntelAI/main/install.sh | sh` — installs and runs
- [ ] `irm https://raw.githubusercontent.com/gitintel-ai/GitIntelAI/main/install.ps1 | iex` — installs and runs

### npm
- [ ] `npm install -g @gitintel/cli` — installs, downloads correct binary, `gitintel --version` works
- [ ] Package visible at `https://www.npmjs.com/package/@gitintel/cli`

### Homebrew
- [ ] `brew tap gitintel-ai/tap` works
- [ ] `brew install gitintel-ai/tap/gitintel` works
- [ ] `gitintel --version` outputs `0.1.0`

---

## 10. Rollback Plan

### If GitHub Release is broken
```bash
# Delete the release (keeps the tag)
gh release delete v0.1.0 --yes

# Delete the tag remotely and locally
git push --delete origin v0.1.0
git tag -d v0.1.0

# Fix the issue, then re-tag
git tag v0.1.0
git push origin v0.1.0
```

### If npm publish is broken
```bash
# Unpublish within 72 hours (npm policy)
npm unpublish @gitintel/cli@0.1.0

# Or deprecate instead (safer)
npm deprecate @gitintel/cli@0.1.0 "broken release, use 0.1.1"
```

### If Homebrew formula is broken
```bash
# Clone the tap repo and revert/fix
git clone git@github.com:gitintel-ai/homebrew-tap.git
cd homebrew-tap
# Fix Formula/gitintel.rb
git commit -am "fix formula for v0.1.0"
git push
```

### Nuclear option
If everything is broken, delete the release + tag, bump to `v0.1.1`, fix all issues, re-release.

---

## 11. Optional: Pre-Release Dry Run

Before the real release, consider tagging `v0.1.0-rc.1` to test the full pipeline:

```bash
git tag v0.1.0-rc.1
git push origin v0.1.0-rc.1
```

This will trigger the full workflow. Verify everything works, then delete the pre-release and tag before doing the real `v0.1.0`.

**Note:** The npm publish will succeed for the RC tag too, so you may want to temporarily remove the npm job or use `--tag next` for pre-releases.
