/**
 * Game Configuration Module
 * Centralized configuration for game-related settings
 */

(function() {
  // Game timer configuration
  const TIMER_CONFIG = {
    // Auto-sync interval (in seconds) - how often to save playtime to database during gameplay
    AUTO_SYNC_INTERVAL: 10,
    
    // Whether to auto-sync is enabled
    AUTO_SYNC_ENABLED: true,
    
    // Display format for timer
    DISPLAY_FORMAT: 'MM:SS'
  };

  // API configuration
  const API_CONFIG = {
    // Statistics API endpoints
    STATISTICS_PLAYTIME: '/api/statistics/playtime',
    STATISTICS_GAME_RESULT: '/api/statistics/game-result',
    
    // User API endpoints
    USER_STATS: '/api/user/stats',
    USER_SETTINGS: '/api/user/settings',
    USER_PROFILE: '/api/user/profile'
  };

  // Game configuration
  const GAME_CONFIG = {
    // Supported game types
    GAMES: {
      MATCHING: 'matching',
      MCQ: 'mcq',
      STORY: 'story',
      ROLEPLAY: 'roleplay'
    },
    
    // Default theme
    DEFAULT_THEME: '中華文化'
  };

  // Export to global scope
  window.GameConfig = {
    TIMER: TIMER_CONFIG,
    API: API_CONFIG,
    GAME: GAME_CONFIG,
    
    // Helper method to get config value with fallback
    get: function(path, defaultValue = null) {
      const parts = path.split('.');
      let value = this;
      for (let part of parts) {
        value = value[part];
        if (value === undefined) return defaultValue;
      }
      return value;
    }
  };

  console.log('[GameConfig] Configuration loaded');
})();
