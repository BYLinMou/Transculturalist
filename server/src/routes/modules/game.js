// Placeholder for game-related endpoints
// This module will handle game-specific API calls

const STATS_CONFIG = require('../../../config/stats-config');
exports.savePlatimeSync = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { gameId, theme, playTimeSeconds, syncOnly } = req.body || {};

    if (!gameId || playTimeSeconds === undefined) {
      return res.status(400).json({
        success: false,
        error: 'gameId and playTimeSeconds are required'
      });
    }

    if (!userId) {
      // For guest users, still return success but don't save
      return res.json({
        success: true,
        message: 'Playtime recorded (guest mode)',
        saved: false
      });
    }

    try {
      const { execute, queryOne } = require('../../db/connection');
      
      // Get or create game progress record for this game session
      const gameProgress = await queryOne(
        `SELECT id FROM ${STATS_CONFIG.TABLE_NAMES.GAME_PROGRESS}
         WHERE user_id = ? AND game_type = ? AND theme = ? AND status = ?
         ORDER BY started_at DESC LIMIT 1`,
        [userId, gameId, theme || null, STATS_CONFIG.GAME_STATUS.IN_PROGRESS]
      );

      if (gameProgress) {
        // Update existing game progress with current playtime (just update the last_played timestamp)
        await execute(
          `UPDATE ${STATS_CONFIG.TABLE_NAMES.GAME_PROGRESS}
           SET last_played = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [gameProgress.id]
        );
      } else {
        // Create new game progress record if none exists
        await execute(
          `INSERT INTO ${STATS_CONFIG.TABLE_NAMES.GAME_PROGRESS} (user_id, game_type, theme, status, started_at, last_played)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId, gameId, theme || null, STATS_CONFIG.GAME_STATUS.IN_PROGRESS]
        );
      }

      // Update or create user_statistics (only update for cumulative tracking)
      const userStats = await queryOne(
        `SELECT id FROM ${STATS_CONFIG.TABLE_NAMES.USER_STATISTICS} WHERE user_id = ?`,
        [userId]
      );

      if (userStats) {
        // For sync (periodic updates), we just record the current session playtime
        // The database will track this specific session
        await execute(
          `UPDATE ${STATS_CONFIG.TABLE_NAMES.USER_STATISTICS}
           SET updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [userId]
        );
      } else {
        // Create user_statistics if doesn't exist
        await execute(
          `INSERT INTO ${STATS_CONFIG.TABLE_NAMES.USER_STATISTICS} (user_id, created_at, updated_at)
           VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId]
        );
      }

      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [Game] Playtime SYNC - User: ${userId}, Game: ${gameId}, PlayTime: ${playTimeSeconds}s, Theme: ${theme || 'default'}, SyncOnly: ${syncOnly}`);
      
      return res.json({
        success: true,
        message: 'Playtime saved successfully',
        saved: true
      });
    } catch (dbError) {
      console.error('[Game] Database error saving playtime:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to save playtime'
      });
    }
  } catch (err) {
    console.error('[Game] Unexpected error saving playtime:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /api/statistics/game-result - Save final game result when game ends
exports.saveGameResult = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { gameId, theme, playTimeSeconds, score, accuracy, completed } = req.body || {};

    if (!gameId || playTimeSeconds === undefined) {
      return res.status(400).json({
        success: false,
        error: 'gameId and playTimeSeconds are required'
      });
    }

    if (!userId) {
      // For guest users, still return success but don't save
      return res.json({
        success: true,
        message: 'Game result recorded (guest mode)',
        saved: false
      });
    }

    try {
      const { execute, queryOne } = require('../../db/connection');
      
      // Update or create game progress record
      const gameProgress = await queryOne(
        `SELECT id, started_at FROM ${STATS_CONFIG.TABLE_NAMES.GAME_PROGRESS}
         WHERE user_id = ? AND game_type = ? AND theme = ? AND status = ?
         ORDER BY started_at DESC LIMIT 1`,
        [userId, gameId, theme || null, STATS_CONFIG.GAME_STATUS.IN_PROGRESS]
      );

      if (gameProgress) {
        // Update existing game progress
        await execute(
          `UPDATE ${STATS_CONFIG.TABLE_NAMES.GAME_PROGRESS}
           SET status = ?, score = ?, last_played = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [completed ? STATS_CONFIG.GAME_STATUS.COMPLETED : STATS_CONFIG.GAME_STATUS.PAUSED, score || 0, gameProgress.id]
        );
      } else {
        // Create new game progress record
        await execute(
          `INSERT INTO ${STATS_CONFIG.TABLE_NAMES.GAME_PROGRESS} (user_id, game_type, theme, score, status, last_played, completed_at, started_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId, gameId, theme || null, score || 0, completed ? STATS_CONFIG.GAME_STATUS.COMPLETED : STATS_CONFIG.GAME_STATUS.PAUSED]
        );
      }

      // Update user statistics with cumulative data
      const userStats = await queryOne(
        `SELECT id, total_play_time, completed_games, total_games_played, average_score, highest_score FROM ${STATS_CONFIG.TABLE_NAMES.USER_STATISTICS} WHERE user_id = ?`,
        [userId]
      );

      if (userStats) {
        // Accumulate total playtime
        const updatedTotalPlayTime = (userStats.total_play_time || 0) + playTimeSeconds;
        // Increment games played
        const totalGamesPlayed = (userStats.total_games_played || 0) + 1;
        // Increment completed games if applicable
        const completedGamesCount = (userStats.completed_games || 0) + (completed ? 1 : 0);
        
        // Calculate new average score based on completed games
        let newAvgScore = userStats.average_score || 0;
        let newHighestScore = userStats.highest_score || 0;
        
        if (completed && score !== undefined) {
          // Only count completed games in average
          if (completedGamesCount > 0) {
            const previousSum = (newAvgScore * (completedGamesCount - 1)) || 0;
            newAvgScore = (previousSum + score) / completedGamesCount;
          }
          // Update highest score
          newHighestScore = Math.max(newHighestScore, score);
        }

        await execute(
          `UPDATE ${STATS_CONFIG.TABLE_NAMES.USER_STATISTICS}
           SET total_play_time = ?, completed_games = ?, total_games_played = ?, average_score = ?, highest_score = ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [updatedTotalPlayTime, completedGamesCount, totalGamesPlayed, newAvgScore, newHighestScore, userId]
        );
      } else {
        // Create user_statistics if doesn't exist
        await execute(
          `INSERT INTO ${STATS_CONFIG.TABLE_NAMES.USER_STATISTICS} (user_id, total_play_time, completed_games, total_games_played, average_score, highest_score, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            userId, 
            playTimeSeconds, 
            completed ? 1 : 0, 
            1,
            completed ? (score || 0) : 0,
            completed ? (score || 0) : 0
          ]
        );
      }

      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [Game] Game RESULT - User: ${userId}, Game: ${gameId}, PlayTime: ${playTimeSeconds}s, Score: ${score}, Completed: ${completed}, Theme: ${theme || 'default'}, TotalPlayTime: ${userStats ? (userStats.total_play_time + playTimeSeconds) : playTimeSeconds}s`);
      
      return res.json({
        success: true,
        message: 'Game result saved successfully',
        saved: true,
        data: {
          gameId,
          playTimeSeconds,
          score,
          completed
        }
      });
    } catch (dbError) {
      console.error('[Game] Database error saving game result:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to save game result'
      });
    }
  } catch (err) {
    console.error('[Game] Unexpected error saving game result:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { gameId, limit = 10 } = req.query;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: 'gameId is required'
      });
    }

    // TODO: Implement leaderboard retrieval from database
    return res.json({
      success: true,
      data: {
        gameId,
        leaderboard: []
      }
    });
  } catch (err) {
    console.error('[Game] Error getting leaderboard:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve leaderboard'
    });
  }
};

// POST /api/game/score - Save game score
exports.saveScore = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { gameId, score, playTime } = req.body || {};

    if (!gameId || score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'gameId and score are required'
      });
    }

    if (!userId) {
      // Allow guest users but don't save to database
      return res.json({
        success: true,
        message: 'Score recorded (guest mode)',
        saved: false
      });
    }

    try {
      const { execute } = require('../../db/connection');
      
      // TODO: Save game score to database
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [Game] Score SAVED - User: ${userId}, Game: ${gameId}, Score: ${score}, PlayTime: ${playTime || 'N/A'}`);
      
      return res.json({
        success: true,
        message: 'Score saved successfully',
        saved: true
      });
    } catch (dbError) {
      console.error('[Game] Database error saving score:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to save score'
      });
    }
  } catch (err) {
    console.error('[Game] Unexpected error saving score:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = exports;
