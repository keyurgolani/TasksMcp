#!/usr/bin/env node

import fs from 'fs';

console.log('Validating package.json structure...');

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

console.log('Package name:', pkg.name);
console.log('Version:', pkg.version);
console.log('Main entry:', pkg.main);
console.log('Binary:', pkg.bin);
console.log('Files included:', pkg.files);

// Validate required fields
if (!pkg.name || !pkg.version || !pkg.main) {
  throw new Error('Missing required package.json fields');
}

// Validate files exist
if (!fs.existsSync(pkg.main)) {
  throw new Error('Main entry file does not exist: ' + pkg.main);
}

console.log('✅ Package validation passed');