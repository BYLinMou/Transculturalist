const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '../../config/games');

function loadAllConfigs() {
  const files = fs.readdirSync(GAMES_DIR);
  const configs = {};
  files.forEach(f => {
    if (f.endsWith('.json')) {
      const c = JSON.parse(fs.readFileSync(path.join(GAMES_DIR, f), 'utf8'));
      configs[c.id] = c;
    }
  });
  return configs;
}

const gameConfigs = loadAllConfigs();

function getGameConfig(gameId) {
  return gameConfigs[gameId] || null;
}

function listGames() {
  return Object.values(gameConfigs).map(c => ({ id: c.id, name: c.name, description: c.description, params: c.params || {} }));
}

// Simple template renderer (安全：只替換 known keys)
function renderTemplate(template, vars = {}) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return String(vars[key]);
    }
    return '';
  });
}

module.exports = { getGameConfig, renderTemplate, listGames };
