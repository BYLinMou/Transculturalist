// Copy this file to config.js and fill in your API keys (do not add config.js to git)
module.exports = {
  // ========== OpenAI API Configuration ==========
  // Your API key here
  // e.g. OPENAI_API_KEY: 'sk-xxxxxx',
  OPENAI_API_KEY: '',
  // BASE_URL example:
  // If you are using the OpenAI official API, fill in 'https://api.openai.com/v1'
  // If using other proxy or self-hosted, please fill in the corresponding base URL (without path)
  // Please add /v1 after BASE_URL
  // BASE_URL: 'https://api.openai.com/v1',
  BASE_URL: '',
  // Optional: default model to use when a request doesn't provide one.
  // Example: DEFAULT_MODEL: 'gpt-4o-mini'
  DEFAULT_MODEL: '',
  
  // ========== Server Configuration ==========
  // Server port
  PORT: 3030,
  
  // ========== Authentication Configuration ==========
  ENABLE_AUTH: false,   // Set to true to enable multi-user authentication
  
  // ========== Database Configuration ==========
  // Only needed if ENABLE_AUTH is true
  // Priority: config.js > environment variables > defaults
  
  // ===== Option 1: SQLite (Local Development) - Recommended for local dev =====
  DB_TYPE: 'sqlite',
  // For SQLite: database file path (relative to server directory)
  DB_PATH: './data/transculturalist.db',
  
  // ===== Option 2: PostgreSQL (Remote/Production) =====
  // Uncomment the following and set DB_TYPE to 'postgres' to use PostgreSQL
  // DB_TYPE: 'postgres',
  // DB_HOST: 'localhost',
  // DB_PORT: 5432,
  // DB_NAME: 'transculturalist',
  // DB_USER: 'postgres',
  // DB_PASSWORD: 'postgres',
  
  // Other settings (S3, DB connections)
};
