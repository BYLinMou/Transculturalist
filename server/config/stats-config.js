/**
 * Game Statistics Configuration
 * Server-side configuration for game statistics and timing
 */

const STATS_CONFIG = {
  // Auto-sync interval in seconds (how often frontend should save playtime during gameplay)
  AUTO_SYNC_INTERVAL: 10,

  // Statistics table name
  TABLE_NAMES: {
    USER_STATISTICS: 'user_statistics',
    GAME_PROGRESS: 'game_progress',
    USER_PREFERENCES: 'user_preferences'
  },

  // Game status
  GAME_STATUS: {
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    PAUSED: 'paused'
  },

  // Game types
  GAME_TYPES: {
    MATCHING: 'matching',
    MCQ: 'mcq',
    STORY: 'story',
    ROLEPLAY: 'roleplay'
  },

  // Statistics fields
  STATS_FIELDS: {
    TOTAL_PLAY_TIME: 'total_play_time',
    COMPLETED_GAMES: 'completed_games',
    TOTAL_GAMES_PLAYED: 'total_games_played',
    AVERAGE_SCORE: 'average_score',
    HIGHEST_SCORE: 'highest_score',
    FORUM_CONTRIBUTIONS: 'forum_contributions'
  }
};

module.exports = STATS_CONFIG;
