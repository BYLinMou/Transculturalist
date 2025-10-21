#!/usr/bin/env node
// Test script to verify config and package loading

console.log('[Test] Starting configuration and package loading test...\n');

const path = require('path');

// Simulate loading from modules directory
console.log('[Test] Simulating load from src/routes/modules/general.js\n');

try {
  const configLoader = require('./src/shared/config-loader');
  const packageLoader = require('./src/shared/package-loader');
  
  console.log('[Test] ✓ Successfully required loaders');
  
  const config = configLoader.getSafeConfig();
  console.log('[Test] ✓ Config loaded:');
  console.log('  - enableAuth:', config.enableAuth);
  console.log('  - port:', config.port);
  
  const packageInfo = packageLoader.getPackageInfo();
  console.log('\n[Test] ✓ Package info loaded:');
  console.log('  - version:', packageInfo.version);
  console.log('  - publishDate:', packageInfo.publishDate);
  console.log('  - name:', packageInfo.name);
  console.log('  - description:', packageInfo.description);
  
  console.log('\n[Test] ✓ All tests passed!');
} catch (err) {
  console.error('[Test] ✗ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}
