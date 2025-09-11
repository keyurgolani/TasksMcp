#!/usr/bin/env node

process.env.NODE_ENV = 'test';

console.log('Checking memory usage...');

const startMemory = process.memoryUsage();

import('../../dist/index.js').then(() => {
  const endMemory = process.memoryUsage();
  console.log('Memory usage:');
  console.log('RSS:', Math.round((endMemory.rss - startMemory.rss) / 1024 / 1024), 'MB');
  console.log('Heap Used:', Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024), 'MB');
  console.log('✅ Memory usage check complete');
}).catch(e => {
  console.error('❌ Memory usage check failed:', e.message);
  process.exit(1);
});