const path = require('path');
const express = require('express');
const app = express();
const apiRouter = require('./routes/api');

// Load configuration (priority: config.js > environment variables > defaults)
let config = {};
try {
  config = require('../config');
} catch (e) {
  try {
    config = require('/app/server/config');
  } catch (e2) {
    console.warn('[App] Config file not found, using environment variables and defaults');
  }
}

const PORT = config.PORT || process.env.PORT || 3030;

// ========== Database Initialization ==========
// Only initialize database if ENABLE_AUTH is true
async function initializeApp() {
  try {
    const enableAuth = config.ENABLE_AUTH || process.env.ENABLE_AUTH === 'true';

    if (enableAuth) {
      // Log the current database configuration
      const { getDatabaseConfig } = require('./db/connection');
      const dbConfig = getDatabaseConfig();
      console.log('[App] ═'.repeat(30));
      console.log('[App] Database Configuration:');
      console.log('[App] ─'.repeat(30));
      console.log(`[App] Database Type: ${dbConfig.type.toUpperCase()}`);
      if (dbConfig.type === 'sqlite') {
        console.log(`[App] Database Path: ${dbConfig.path}`);
      } else if (dbConfig.type === 'postgres') {
        console.log(`[App] PostgreSQL Host: ${dbConfig.host}:${dbConfig.port}`);
        console.log(`[App] Database Name: ${dbConfig.database}`);
        console.log(`[App] Database User: ${dbConfig.user}`);
      }
      console.log('[App] ═'.repeat(30));
      
      console.log('[App] Auth is enabled, initializing database...');
      const { initializeDatabase } = require('./db/initialize');
      const success = await initializeDatabase();
      
      if (success) {
        console.log('[App] ✓ Database initialization complete');
      } else {
        console.warn('[App] ⚠ Database initialization failed, continuing in guest mode');
      }
    } else {
      console.log('[App] Auth is disabled, skipping database initialization');
    }
  } catch (error) {
    console.error('[App] Failed to initialize database:', error.message);
    console.warn('[App] Continuing without authentication features');
  }

  // ========== Start Express Server ==========
  // Serve frontend static files
  app.use(express.static(path.join(__dirname, '../../frontend/public')));

  // JSON body parsing
  app.use(express.json());

  // Authentication middleware
  const { authMiddleware } = require('./middleware/auth');
  app.use('/api', authMiddleware);

  // API
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const { getDatabaseStatus } = require('./db/initialize');
      const dbStatus = await getDatabaseStatus();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        auth: config.ENABLE_AUTH || false,
        database: dbStatus
      });
    } catch (error) {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        auth: false,
        database: {
          connected: false,
          message: 'Database not configured'
        }
      });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[App] ✓ Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[App] Auth enabled: ${config.ENABLE_AUTH || false}`);
  });
}

// Start application
initializeApp().catch(err => {
  console.error('[App] ✗ Failed to start application:', err);
  process.exit(1);
});
