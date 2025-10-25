const { listGames } = require('../../services/gameConfigService');
const { getSafeConfig } = require('../../shared/config-loader');
const { getPackageInfo } = require('../../shared/package-loader');

// GET /api/health
exports.health = (req, res) => {
  res.json({ ok: true });
};

// GET /api/version
exports.version = (req, res) => {
  try {
    const packageInfo = getPackageInfo();
    console.log('[Version API] Returning package info:', packageInfo);
    res.json(packageInfo);
  } catch (err) {
    console.error('[Version API] Unexpected error:', err.message);
    res.json({
      version: 'unknown',
      publishDate: 'unknown',
      name: 'Transculturalist',
      description: 'A cultural exploration game platform'
    });
  }
};

// GET /api/config
exports.config = (req, res) => {
  try {
    const config = getSafeConfig();
    console.log('[Config API] Returning config - enableAuth:', config.enableAuth, 'port:', config.port);
    res.json(config);
  } catch (err) {
    console.error('[Config] Unexpected error:', err.message);
    res.json({
      enableAuth: false,
      port: 3030
    });
  }
};

// GET /api/games
exports.games = (req, res) => {
  try {
    const games = listGames();
    res.json({ success: true, games });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
