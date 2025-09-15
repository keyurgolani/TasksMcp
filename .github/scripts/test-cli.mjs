#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const cliPath = join(projectRoot, 'dist/app/cli.js');

console.log('Testing CLI executable...');

const child = spawn('node', [cliPath, '--version'], {
  stdio: 'pipe',
  cwd: projectRoot
});

let output = '';
let error = '';

child.stdout.on('data', (data) => {
  output += data.toString();
});

child.stderr.on('data', (data) => {
  error += data.toString();
});

// Add timeout to prevent hanging
const timeout = setTimeout(() => {
  console.error('❌ CLI test timed out after 10 seconds');
  child.kill('SIGTERM');
  process.exit(1);
}, 10000);

child.on('close', (code) => {
  clearTimeout(timeout);
  if (code === 0) {
    console.log('✅ CLI test passed');
    console.log('Output:', output.trim());
    process.exit(0);
  } else {
    console.error('❌ CLI test failed');
    console.error('Error:', error);
    console.error('Exit code:', code);
    process.exit(1);
  }
});

child.on('error', (err) => {
  clearTimeout(timeout);
  console.error('❌ Failed to start CLI process:', err.message);
  process.exit(1);
});