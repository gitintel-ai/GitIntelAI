#!/usr/bin/env node
'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');

const VERSION = require('./package.json').version;
const REPO = 'gitintel-ai/GitIntelAI';
const BIN_DIR = path.join(__dirname, 'bin');

// ── Platform detection ────────────────────────────────────────────────────────

const PLATFORM_MAP = { linux: 'linux', darwin: 'macos', win32: 'windows' };
const ARCH_MAP = { x64: 'amd64', arm64: 'arm64' };

const platform = PLATFORM_MAP[process.platform];
const arch = ARCH_MAP[process.arch];

if (!platform) {
  warn(`Unsupported platform: ${process.platform}`);
  process.exit(0); // soft exit — don't block npm install
}
if (!arch) {
  warn(`Unsupported architecture: ${process.arch}`);
  process.exit(0);
}

const isWindows = process.platform === 'win32';
const artifactName = isWindows
  ? `gitintel-${platform}-${arch}.exe`
  : `gitintel-${platform}-${arch}`;
const binName = isWindows ? 'gitintel.exe' : 'gitintel';
const binPath = path.join(BIN_DIR, binName);
const downloadUrl = `https://github.com/${REPO}/releases/download/v${VERSION}/${artifactName}`;

// ── Download helper (follows redirects) ──────────────────────────────────────

function download(url, dest, hops = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 5) return reject(new Error('Too many redirects'));

    const tmp = dest + '.tmp';
    const file = fs.createWriteStream(tmp);

    https
      .get(url, { headers: { 'User-Agent': 'gitintel-npm-installer' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.destroy();
          fs.rmSync(tmp, { force: true });
          return download(res.headers.location, dest, hops + 1).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          file.destroy();
          fs.rmSync(tmp, { force: true });
          return reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        }

        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            fs.renameSync(tmp, dest);
            resolve();
          });
        });
        file.on('error', (err) => {
          fs.rmSync(tmp, { force: true });
          reject(err);
        });
      })
      .on('error', (err) => {
        fs.rmSync(tmp, { force: true });
        reject(err);
      });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Skip if binary already present (reinstall / ci cache)
  if (fs.existsSync(binPath)) {
    console.log(`  gitintel v${VERSION} already installed, skipping download.`);
    return;
  }

  console.log(`\n  Downloading gitintel v${VERSION} (${platform}/${arch})...`);

  fs.mkdirSync(BIN_DIR, { recursive: true });

  try {
    await download(downloadUrl, binPath);
    if (!isWindows) fs.chmodSync(binPath, 0o755);
    console.log(`  ✓ gitintel v${VERSION} ready`);
    console.log(`  Run 'gitintel --version' to verify.`);
    console.log(`  Run 'gitintel init' in a git repo to get started.\n`);
  } catch (err) {
    warn(`Could not download gitintel binary: ${err.message}`);
    warn(`Download manually: https://github.com/${REPO}/releases/tag/v${VERSION}`);
    warn(`Or build from source: https://github.com/${REPO}`);
    // Soft exit — don't block the npm install of the caller
  }
}

function warn(msg) {
  console.warn(`  ⚠  ${msg}`);
}

main().catch((err) => {
  warn(err.message);
});
