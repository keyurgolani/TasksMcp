#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('Validating MCP protocol structure...');

// Check handlers directory
const handlersDir = './dist/handlers';
if (!fs.existsSync(handlersDir)) {
  throw new Error('Handlers directory not found');
}

const handlers = fs.readdirSync(handlersDir).filter(f => f.endsWith('.js'));
console.log('Found handlers:', handlers);

if (handlers.length < 7) {
  throw new Error('Expected at least 7 MCP handlers, found: ' + handlers.length);
}

console.log('✅ MCP structure validation passed');