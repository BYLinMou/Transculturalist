/**
 * Centralized configuration loader
 * Tries to load from .env first, then falls back to config.js
 */

// Try to load .env if it exists
try {
  require('dotenv').config();
} catch (err) {
  // .env not required
}

// Load config.js as fallback
let configFile = {};
try {
  configFile = require('../config.js');
} catch (err) {
  // config.js doesn't exist
}

// Function to get a config value with fallback chain: env -> config.js -> default
function getConfig(key, defaultValue = null) {
  // Try environment variable first
  if (process.env[key]) {
    return process.env[key];
  }
  // Try config.js
  if (configFile[key]) {
    return configFile[key];
  }
  // Return default
  return defaultValue;
}

module.exports = {
  getConfig,
  PORT: getConfig('PORT', 3030),
  ENABLE_AUTH: getConfig('ENABLE_AUTH', 'false'),
  SUPABASE_URL: getConfig('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getConfig('SUPABASE_ANON_KEY'),
  OPENAI_API_KEY: getConfig('OPENAI_API_KEY'),
  BASE_URL: getConfig('BASE_URL'),
  DEFAULT_MODEL: getConfig('DEFAULT_MODEL'),
};
