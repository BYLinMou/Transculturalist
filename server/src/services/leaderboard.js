/**
 * Leaderboard Service
 * Handles leaderboard ranking calculations and data retrieval
 */

const STATS_CONFIG = require('../../config/stats-config');

/**
 * Calculate ranking score based on play time and completed games
 * Formula: (总时长分钟数 × 1.5) + (已完成游戏数)
 * This formula prioritizes play time over game count
 */
function calculateScore(totalPlayTimeSeconds, completedGames) {
  const totalPlayTimeMinutes = (totalPlayTimeSeconds / 60);
  const score = (totalPlayTimeMinutes * 1.5) + completedGames;
  return parseFloat(score.toFixed(2));
}

/**
 * Get game duration leaderboard
 * Rankings based on total play time with game count as secondary factor
 */
async function getGameDurationLeaderboard(limit = 50) {
  try {
    const { queryAll } = require('../db/connection');
    
    const rankings = await queryAll(
      `SELECT 
        u.id,
        u.username,
        us.total_play_time,
        us.completed_games,
        us.total_games_played,
        us.average_score,
        us.updated_at
      FROM ${STATS_CONFIG.TABLE_NAMES.USER_STATISTICS} us
      JOIN users u ON us.user_id = u.id
      WHERE u.is_active = 1 AND us.completed_games > 0
      ORDER BY us.total_play_time DESC, us.completed_games DESC
      LIMIT ?`,
      [limit]
    );

    // Calculate scores and add rank
    return rankings.map((row, index) => ({
      rank: index + 1,
      userId: row.id,
      username: row.username,
      totalPlayTimeSeconds: row.total_play_time || 0,
      totalPlayTimeMinutes: parseFloat(((row.total_play_time || 0) / 60).toFixed(2)),
      completedGames: row.completed_games || 0,
      totalGamesPlayed: row.total_games_played || 0,
      averageScore: parseFloat((row.average_score || 0).toFixed(2)),
      score: calculateScore(row.total_play_time || 0, row.completed_games || 0),
      lastUpdated: row.updated_at
    }));
  } catch (error) {
    console.error('[Leaderboard] Error getting game duration leaderboard:', error.message);
    throw error;
  }
}

/**
 * Get average score leaderboard
 * Rankings based on average game score
 */
async function getAverageScoreLeaderboard(limit = 50) {
  try {
    const { queryAll } = require('../db/connection');
    
    const rankings = await queryAll(
      `SELECT 
        u.id,
        u.username,
        us.average_score,
        us.highest_score,
        us.completed_games,
        us.total_play_time,
        us.updated_at
      FROM ${STATS_CONFIG.TABLE_NAMES.USER_STATISTICS} us
      JOIN users u ON us.user_id = u.id
      WHERE u.is_active = 1 AND us.completed_games > 0
      ORDER BY us.average_score DESC, us.completed_games DESC
      LIMIT ?`,
      [limit]
    );

    return rankings.map((row, index) => ({
      rank: index + 1,
      userId: row.id,
      username: row.username,
      averageScore: parseFloat((row.average_score || 0).toFixed(2)),
      highestScore: parseFloat((row.highest_score || 0).toFixed(2)),
      completedGames: row.completed_games || 0,
      totalPlayTimeMinutes: parseFloat(((row.total_play_time || 0) / 60).toFixed(2)),
      lastUpdated: row.updated_at
    }));
  } catch (error) {
    console.error('[Leaderboard] Error getting average score leaderboard:', error.message);
    throw error;
  }
}

/**
 * Get forum contribution leaderboard
 * Rankings based on forum contributions (currently disabled)
 */
async function getForumContributionLeaderboard(limit = 50) {
  try {
    const { queryAll } = require('../db/connection');
    
    const rankings = await queryAll(
      `SELECT 
        u.id,
        u.username,
        us.forum_contributions,
        us.updated_at
      FROM ${STATS_CONFIG.TABLE_NAMES.USER_STATISTICS} us
      JOIN users u ON us.user_id = u.id
      WHERE u.is_active = 1 AND us.forum_contributions > 0
      ORDER BY us.forum_contributions DESC
      LIMIT ?`,
      [limit]
    );

    return rankings.map((row, index) => ({
      rank: index + 1,
      userId: row.id,
      username: row.username,
      forumContributions: row.forum_contributions || 0,
      lastUpdated: row.updated_at
    }));
  } catch (error) {
    console.error('[Leaderboard] Error getting forum contribution leaderboard:', error.message);
    throw error;
  }
}

/**
 * Get user's rank and surrounding ranks
 */
async function getUserRankContext(userId, leaderboardType = 'game-duration') {
  try {
    let leaderboard;
    
    switch (leaderboardType) {
      case 'average-score':
        leaderboard = await getAverageScoreLeaderboard(1000);
        break;
      case 'forum-contribution':
        leaderboard = await getForumContributionLeaderboard(1000);
        break;
      case 'game-duration':
      default:
        leaderboard = await getGameDurationLeaderboard(1000);
    }

    const userRankIndex = leaderboard.findIndex(row => row.userId === userId);
    
    if (userRankIndex === -1) {
      return null;
    }

    // Return the user's rank and surrounding 2 users above and below
    const start = Math.max(0, userRankIndex - 2);
    const end = Math.min(leaderboard.length, userRankIndex + 3);
    
    return {
      userRank: leaderboard[userRankIndex],
      surrounding: leaderboard.slice(start, end)
    };
  } catch (error) {
    console.error('[Leaderboard] Error getting user rank context:', error.message);
    throw error;
  }
}

module.exports = {
  calculateScore,
  getGameDurationLeaderboard,
  getAverageScoreLeaderboard,
  getForumContributionLeaderboard,
  getUserRankContext
};
