#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const binName = process.platform === 'win32' ? 'gitintel.exe' : 'gitintel';
const binPath = path.join(__dirname, binName);

if (!fs.existsSync(binPath)) {
  console.error('gitintel binary not found.');
  console.error('Try reinstalling:  npm install -g @gitintel-cli/gitintel');
  console.error('Or build from source: https://github.com/gitintel-ai/GitIntelAI');
  process.exit(1);
}

const result = spawnSync(binPath, process.argv.slice(2), { stdio: 'inherit' });

if (result.error) {
  console.error(`Failed to run gitintel: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 0);
