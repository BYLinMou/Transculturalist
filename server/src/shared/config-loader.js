// Shared configuration loader
// Ensures consistent config loading across the application

let cachedConfig = null;

function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  let config = {};
  
  try {
    config = require('../../config');
    console.log('[ConfigLoader] ✓ Loaded config from ../../config');
  } catch (e) {
    console.warn('[ConfigLoader] Failed to load from ../../config:', e.message);
    try {
      config = require('../../../config');
      console.log('[ConfigLoader] ✓ Loaded config from ../../../config');
    } catch (e2) {
      console.warn('[ConfigLoader] Failed to load from ../../../config:', e2.message);
      try {
        config = require('/app/server/config');
        console.log('[ConfigLoader] ✓ Loaded config from /app/server/config');
      } catch (e3) {
        console.warn('[ConfigLoader] Failed to load from /app/server/config:', e3.message);
        console.warn('[ConfigLoader] Using default config with environment variables');
      }
    }
  }

  // Apply environment variable overrides
  config.OPENAI_API_KEY = process.env.OPENAI_API_KEY || config.OPENAI_API_KEY;
  config.BASE_URL = process.env.BASE_URL || config.BASE_URL;
  config.DEFAULT_MODEL = process.env.DEFAULT_MODEL || config.DEFAULT_MODEL;
  config.PORT = parseInt(process.env.PORT || config.PORT || 3030);
  config.ENABLE_AUTH = process.env.ENABLE_AUTH === 'true' || config.ENABLE_AUTH || false;
  config.DB_TYPE = process.env.DB_TYPE || config.DB_TYPE || 'sqlite';
  config.DB_PATH = process.env.DB_PATH || config.DB_PATH || './data/transculturalist.db';

  cachedConfig = config;
  return config;
}

function getConfig() {
  return loadConfig();
}

function getSafeConfig() {
  const config = loadConfig();
  return {
    enableAuth: config.ENABLE_AUTH || false,
    port: config.PORT || 3030
  };
}

module.exports = {
  loadConfig,
  getConfig,
  getSafeConfig
};
