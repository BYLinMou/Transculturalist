// Test script to verify config loading
const path = require('path');

console.log('[Test] Current file:', __filename);
console.log('[Test] Current dir:', __dirname);

// Test from server root
console.log('\n[Test] From server root:');
try {
  const config1 = require('./config');
  console.log('[Test] ✓ Loaded from ./config:', config1.ENABLE_AUTH);
} catch (err) {
  console.log('[Test] ✗ Failed to load from ./config:', err.message);
}

// Test from src
console.log('\n[Test] From src/routes/modules:');
const testPath = path.resolve(__dirname, 'src/routes/modules');
process.chdir(testPath);
console.log('[Test] Changed to:', process.cwd());
try {
  const config2 = require('../../config');
  console.log('[Test] ✓ Loaded from ../../config:', config2.ENABLE_AUTH);
} catch (err) {
  console.log('[Test] ✗ Failed to load from ../../config:', err.message);
}

// Test absolute path
console.log('\n[Test] Absolute path:');
const configPath = path.resolve(__dirname, 'config.js');
console.log('[Test] Config path:', configPath);
try {
  const config3 = require(configPath);
  console.log('[Test] ✓ Loaded from absolute path:', config3.ENABLE_AUTH);
} catch (err) {
  console.log('[Test] ✗ Failed to load from absolute path:', err.message);
}
