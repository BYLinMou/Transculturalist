/**
 * Guest Game Storage Module
 * 
 * For guest users (not logged in), stores game time and records in sessionStorage.
 * Data is automatically cleared when the browser window/tab is closed.
 * 
 * Features:
 * - Session-based storage (cleared on window close)
 * - Game time tracking per game type and theme
 * - Game result recording (score, accuracy, completion status)
 * - Total statistics calculation
 */

(function() {
  // Storage keys
  const GUEST_GAMES_KEY = 'guest_game_records';
  const GUEST_STATS_KEY = 'guest_game_stats';
  const GUEST_PLAYTIME_SESSION_KEY = 'guest_playtime_session';

  /**
   * Initialize guest storage structure
   */
  function initializeGuestStorage() {
    if (!sessionStorage.getItem(GUEST_GAMES_KEY)) {
      sessionStorage.setItem(GUEST_GAMES_KEY, JSON.stringify([]));
    }
    if (!sessionStorage.getItem(GUEST_STATS_KEY)) {
      sessionStorage.setItem(GUEST_STATS_KEY, JSON.stringify({
        total_play_time: 0,
        completed_games: 0,
        total_games_played: 0,
        average_score: 0,
        highest_score: 0,
        games_by_type: {}
      }));
    }
  }

  /**
   * Record playtime for a game session
   * Called periodically during game play
   * 
   * @param {string} gameId - Game type (mcq, matching, roleplay, story)
   * @param {string} theme - Selected theme
   * @param {number} playTimeSeconds - Current play time in seconds
   */
  function recordPlaytime(gameId, theme, playTimeSeconds) {
    if (!gameId || playTimeSeconds === undefined) {
      console.error('[GuestGameStorage] Invalid parameters for recordPlaytime');
      return false;
    }

    try {
      initializeGuestStorage();
      
      // Create or get current session record
      let games = JSON.parse(sessionStorage.getItem(GUEST_GAMES_KEY) || '[]');
      
      // Find existing game session (most recent in-progress game)
      let currentGame = games.find(g => 
        g.gameId === gameId && g.theme === theme && g.status === 'in_progress'
      );

      if (!currentGame) {
        // Create new game session
        currentGame = {
          id: `guest_${gameId}_${theme}_${Date.now()}`,
          gameId: gameId,
          theme: theme,
          playTimeSeconds: playTimeSeconds,
          status: 'in_progress',
          score: 0,
          accuracy: 0,
          completed: false,
          started_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
          syncOnly: true
        };
        games.push(currentGame);
      } else {
        // Update existing game session
        currentGame.playTimeSeconds = playTimeSeconds;
        currentGame.last_updated_at = new Date().toISOString();
      }

      sessionStorage.setItem(GUEST_GAMES_KEY, JSON.stringify(games));
      console.log(`[GuestGameStorage] Recorded playtime: ${gameId} - ${playTimeSeconds}s`);
      
      return true;
    } catch (error) {
      console.error('[GuestGameStorage] Error recording playtime:', error);
      return false;
    }
  }

  /**
   * Save final game result when game ends
   * 
   * @param {string} gameId - Game type
   * @param {string} theme - Selected theme
   * @param {number} playTimeSeconds - Total play time
   * @param {object} additionalData - Score, accuracy, completion status, etc.
   */
  function saveGameResult(gameId, theme, playTimeSeconds, additionalData = {}) {
    if (!gameId || playTimeSeconds === undefined) {
      console.error('[GuestGameStorage] Invalid parameters for saveGameResult');
      return false;
    }

    try {
      initializeGuestStorage();
      
      let games = JSON.parse(sessionStorage.getItem(GUEST_GAMES_KEY) || '[]');
      let stats = JSON.parse(sessionStorage.getItem(GUEST_STATS_KEY) || '{}');

      // Find or create game record
      let gameRecord = games.find(g => 
        g.gameId === gameId && g.theme === theme && g.status === 'in_progress'
      );

      if (!gameRecord) {
        // Create new record if not found
        gameRecord = {
          id: `guest_${gameId}_${theme}_${Date.now()}`,
          gameId: gameId,
          theme: theme,
          playTimeSeconds: playTimeSeconds,
          status: 'completed',
          score: additionalData.score || 0,
          accuracy: additionalData.accuracy || 0,
          completed: additionalData.completed || false,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        games.push(gameRecord);
      } else {
        // Update existing record
        gameRecord.playTimeSeconds = playTimeSeconds;
        gameRecord.score = additionalData.score || gameRecord.score;
        gameRecord.accuracy = additionalData.accuracy || gameRecord.accuracy;
        gameRecord.completed = additionalData.completed || false;
        gameRecord.status = 'completed';
        gameRecord.completed_at = new Date().toISOString();
      }

      // Update statistics
      stats.total_play_time = (stats.total_play_time || 0) + playTimeSeconds;
      stats.total_games_played = (stats.total_games_played || 0) + 1;
      
      if (gameRecord.completed) {
        stats.completed_games = (stats.completed_games || 0) + 1;
        // Update average score based on completed games only
        const completedGames = games.filter(g => g.completed);
        if (completedGames.length > 0) {
          const totalScore = completedGames.reduce((sum, g) => sum + (g.score || 0), 0);
          stats.average_score = totalScore / completedGames.length;
        }
      }
      
      // Update highest score
      const allScores = games.map(g => g.score || 0);
      stats.highest_score = Math.max(...allScores, stats.highest_score || 0);

      // Track games by type
      if (!stats.games_by_type) {
        stats.games_by_type = {};
      }
      if (!stats.games_by_type[gameId]) {
        stats.games_by_type[gameId] = {
          count: 0,
          completed: 0,
          total_time: 0,
          average_score: 0
        };
      }
      
      stats.games_by_type[gameId].count += 1;
      stats.games_by_type[gameId].total_time += playTimeSeconds;
      if (gameRecord.completed) {
        stats.games_by_type[gameId].completed += 1;
      }
      if (stats.games_by_type[gameId].count > 0) {
        const gameOfTypeRecords = games.filter(g => g.gameId === gameId);
        const completedOfType = gameOfTypeRecords.filter(g => g.completed);
        if (completedOfType.length > 0) {
          const totalScore = completedOfType.reduce((sum, g) => sum + (g.score || 0), 0);
          stats.games_by_type[gameId].average_score = totalScore / completedOfType.length;
        }
      }

      sessionStorage.setItem(GUEST_GAMES_KEY, JSON.stringify(games));
      sessionStorage.setItem(GUEST_STATS_KEY, JSON.stringify(stats));
      
      console.log('[GuestGameStorage] Saved game result:', gameRecord);
      console.log('[GuestGameStorage] Updated statistics:', stats);
      
      return true;
    } catch (error) {
      console.error('[GuestGameStorage] Error saving game result:', error);
      return false;
    }
  }

  /**
   * Get all guest game records
   * @returns {array} Array of game records
   */
  function getGameRecords() {
    try {
      initializeGuestStorage();
      return JSON.parse(sessionStorage.getItem(GUEST_GAMES_KEY) || '[]');
    } catch (error) {
      console.error('[GuestGameStorage] Error getting game records:', error);
      return [];
    }
  }

  /**
   * Get guest game statistics
   * @returns {object} Statistics object
   */
  function getStatistics() {
    try {
      initializeGuestStorage();
      return JSON.parse(sessionStorage.getItem(GUEST_STATS_KEY) || '{}');
    } catch (error) {
      console.error('[GuestGameStorage] Error getting statistics:', error);
      return {};
    }
  }

  /**
   * Get statistics for a specific game type
   * @param {string} gameId - Game type
   * @returns {object} Game type statistics
   */
  function getGameStatistics(gameId) {
    try {
      const stats = getStatistics();
      return stats.games_by_type?.[gameId] || null;
    } catch (error) {
      console.error('[GuestGameStorage] Error getting game statistics:', error);
      return null;
    }
  }

  /**
   * Clear all guest game data
   * Used when user logs in or to manually reset session data
   */
  function clearAllData() {
    try {
      sessionStorage.removeItem(GUEST_GAMES_KEY);
      sessionStorage.removeItem(GUEST_STATS_KEY);
      sessionStorage.removeItem(GUEST_PLAYTIME_SESSION_KEY);
      console.log('[GuestGameStorage] All guest data cleared');
      return true;
    } catch (error) {
      console.error('[GuestGameStorage] Error clearing data:', error);
      return false;
    }
  }

  /**
   * Export guest data (for debugging or data transfer)
   * @returns {object} Complete guest data
   */
  function exportData() {
    try {
      initializeGuestStorage();
      return {
        games: JSON.parse(sessionStorage.getItem(GUEST_GAMES_KEY) || '[]'),
        stats: JSON.parse(sessionStorage.getItem(GUEST_STATS_KEY) || '{}'),
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[GuestGameStorage] Error exporting data:', error);
      return null;
    }
  }

  // Export to global scope
  window.GuestGameStorage = {
    recordPlaytime,
    saveGameResult,
    getGameRecords,
    getStatistics,
    getGameStatistics,
    clearAllData,
    exportData
  };

  console.log('[GuestGameStorage] Initialized - Session-based game storage for guest users');
})();
