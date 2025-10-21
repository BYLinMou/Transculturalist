const { isValidUsername, isValidDifficulty } = require('../../shared/validators');

// Default user preferences
const DEFAULT_PREFERENCES = {
  gameSound: true,
  backgroundMusic: true,
  notifications: true,
  difficulty: 'medium'
};

// GET /api/user/settings - Get user settings
exports.getSettings = async (req, res) => {
  try {
    const userId = req.user?.id; // Assuming middleware attaches user info
    
    if (!userId) {
      // Return default settings for guest users
      return res.json({
        success: true,
        isGuest: true,
        settings: {
          preferences: DEFAULT_PREFERENCES
        }
      });
    }

    try {
      const { queryOne } = require('../../db/connection');
      
      // Get user preferences from database
      const userPrefs = await queryOne(
        `SELECT game_sound, background_music, notifications, game_difficulty FROM user_preferences WHERE user_id = ?`,
        [userId]
      );

      if (userPrefs) {
        return res.json({
          success: true,
          isGuest: false,
          settings: {
            preferences: {
              gameSound: userPrefs.game_sound !== 0 && userPrefs.game_sound !== false,
              backgroundMusic: userPrefs.background_music === 1 || userPrefs.background_music === true,
              notifications: userPrefs.notifications !== 0 && userPrefs.notifications !== false,
              difficulty: userPrefs.game_difficulty || DEFAULT_PREFERENCES.difficulty
            }
          }
        });
      } else {
        // Return default settings if no record exists
        return res.json({
          success: true,
          isGuest: false,
          settings: {
            preferences: DEFAULT_PREFERENCES
          }
        });
      }
    } catch (dbError) {
      console.error('[User] Database error getting settings:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve settings'
      });
    }
  } catch (err) {
    console.error('[User] Unexpected error getting settings:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /api/user/settings - Save user settings
exports.saveSettings = async (req, res) => {
  try {
    const userId = req.user?.id; // Assuming middleware attaches user info
    const { preferences } = req.body || {};

    // Validate preferences
    if (preferences) {
      if (preferences.difficulty && !isValidDifficulty(preferences.difficulty)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid difficulty level'
        });
      }
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    try {
      const { execute, queryOne } = require('../../db/connection');
      
      const prefs = preferences || DEFAULT_PREFERENCES;

      // Check if preferences record exists
      const existing = await queryOne(
        'SELECT id FROM user_preferences WHERE user_id = ?',
        [userId]
      );

      if (existing) {
        // Update existing record
        await execute(
          `UPDATE user_preferences 
           SET game_sound = ?, background_music = ?, notifications = ?, game_difficulty = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = ?`,
          [
            prefs.gameSound ? 1 : 0,
            prefs.backgroundMusic ? 1 : 0,
            prefs.notifications ? 1 : 0,
            prefs.difficulty || DEFAULT_PREFERENCES.difficulty,
            userId
          ]
        );
      } else {
        // Create new record
        await execute(
          `INSERT INTO user_preferences (user_id, game_sound, background_music, notifications, game_difficulty, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            userId,
            prefs.gameSound ? 1 : 0,
            prefs.backgroundMusic ? 1 : 0,
            prefs.notifications ? 1 : 0,
            prefs.difficulty || DEFAULT_PREFERENCES.difficulty
          ]
        );
      }

      console.log(`[User] Settings saved for user ${userId}`);
      return res.json({
        success: true,
        message: 'Settings saved successfully',
        settings: {
          preferences: prefs
        }
      });
    } catch (dbError) {
      console.error('[User] Database error saving settings:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to save settings'
      });
    }
  } catch (err) {
    console.error('[User] Unexpected error saving settings:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// GET /api/user/stats - Get user game statistics
exports.getStats = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      // Return default stats for guest users
      return res.json({
        success: true,
        isGuest: true,
        stats: {
          completedGames: 0,
          totalPlayTime: 0,
          averageScore: 0,
          forumContributions: 0
        }
      });
    }

    try {
      const { queryOne } = require('../../db/connection');
      
      // Get user stats from database
      const userStats = await queryOne(
        `SELECT completed_games, total_play_time, average_score, forum_contributions 
         FROM user_stats WHERE user_id = ?`,
        [userId]
      );

      if (userStats) {
        return res.json({
          success: true,
          isGuest: false,
          stats: {
            completedGames: userStats.completed_games || 0,
            totalPlayTime: userStats.total_play_time || 0,
            averageScore: userStats.average_score || 0,
            forumContributions: userStats.forum_contributions || 0
          }
        });
      } else {
        // Return default stats if no record exists
        return res.json({
          success: true,
          isGuest: false,
          stats: {
            completedGames: 0,
            totalPlayTime: 0,
            averageScore: 0,
            forumContributions: 0
          }
        });
      }
    } catch (dbError) {
      console.error('[User] Database error getting stats:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve stats'
      });
    }
  } catch (err) {
    console.error('[User] Unexpected error getting stats:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// GET /api/user/profile - Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    try {
      const { queryOne } = require('../../db/connection');
      
      // Get user profile from database
      const user = await queryOne(
        'SELECT id, email, username FROM users WHERE id = ?',
        [userId]
      );

      if (user) {
        console.log(`[User] Profile retrieved for user ${userId}`);
        return res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            username: user.username
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
    } catch (dbError) {
      console.error('[User] Database error getting profile:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve profile'
      });
    }
  } catch (err) {
    console.error('[User] Unexpected error getting profile:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /api/user/profile - Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { username } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Validate username
    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username'
      });
    }

    try {
      const { execute, queryOne } = require('../../db/connection');
      
      // Update username
      await execute(
        'UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [username, userId]
      );

      // Get updated user info
      const user = await queryOne('SELECT id, email, username FROM users WHERE id = ?', [userId]);

      console.log(`[User] Profile updated for user ${userId}`);
      return res.json({
        success: true,
        message: 'Profile updated successfully',
        user
      });
    } catch (dbError) {
      console.error('[User] Database error updating profile:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  } catch (err) {
    console.error('[User] Unexpected error updating profile:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
