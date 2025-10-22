const crypto = require('crypto');
const { isValidEmail, isValidPassword } = require('../../shared/validators');

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, username, agreedToPrivacyPolicy } = req.body || {};
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const timestamp = new Date().toISOString();

    // Validation
    if (!email || !password) {
      console.log(`[Auth] Register attempt with missing fields - Email: ${email ? 'provided' : 'missing'}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Validate privacy policy agreement
    if (!agreedToPrivacyPolicy) {
      console.log(`[Auth] Register attempt without privacy policy agreement - Email: ${email}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(400).json({ 
        success: false, 
        error: 'You must agree to the Privacy Policy to register' 
      });
    }

    if (!isValidEmail(email)) {
      console.log(`[Auth] Register attempt with invalid email format - Email: ${email}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }

    if (!isValidPassword(password)) {
      console.log(`[Auth] Register attempt with weak password - Email: ${email}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }

    // Check if email already exists
    try {
      const { queryOne, execute } = require('../../db/connection');
      const existingUser = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
      
      if (existingUser) {
        console.log(`[Auth] ⚠ Register attempt with duplicate email - Email: ${email}, IP: ${clientIp}, Time: ${timestamp}`);
        return res.status(409).json({ 
          success: false, 
          error: 'Email already registered' 
        });
      }

      // Hash password (in production, use bcrypt)
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      // Insert new user
      const result = await execute(
        `INSERT INTO users (email, password_hash, username, created_at, updated_at, is_active, is_verified) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0)`,
        [email, passwordHash, username || 'User']
      );

      const newUserId = result.lastID;

      // Create default user preferences
      try {
        await execute(
          `INSERT INTO user_preferences (user_id, game_sound, background_music, notifications, game_difficulty, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [newUserId, 1, 1, 1, 'medium']  // Default: gameSound=true, backgroundMusic=true, notifications=true, difficulty=medium
        );
        console.log(`[Auth] ✓ Default preferences created for user ${newUserId}`);
      } catch (prefError) {
        console.warn(`[Auth] ⚠ Failed to create default preferences for user ${newUserId}:`, prefError.message);
        // Continue anyway, user can set preferences later
      }

      console.log(`[Auth] ✓ User registered successfully - Email: ${email}, Username: ${username || 'User'}, UserID: ${newUserId}, IP: ${clientIp}, Time: ${timestamp}`);

      return res.status(201).json({ 
        success: true, 
        message: 'User registered successfully',
        user: {
          id: newUserId,
          email: email,
          username: username || 'User'
        }
      });
    } catch (dbError) {
      console.error(`[Auth] ✗ Database error during registration - Email: ${email}, Error: ${dbError.message}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error during registration' 
      });
    }
  } catch (err) {
    console.error('[Auth] ✗ Unexpected error during registration:', err.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const timestamp = new Date().toISOString();

    // Validation
    if (!email || !password) {
      console.log(`[Auth] Login attempt with missing fields - Email: ${email ? 'provided' : 'missing'}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    try {
      const { queryOne, execute } = require('../../db/connection');
      
      // Hash password
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      // Find user
      const user = await queryOne(
        'SELECT id, email, username, is_active FROM users WHERE email = ? AND password_hash = ?',
        [email, passwordHash]
      );

      if (!user) {
        console.log(`[Auth] ⚠ Failed login attempt - Email: ${email}, IP: ${clientIp}, Time: ${timestamp}`);
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }

      if (!user.is_active) {
        console.log(`[Auth] ⚠ Login attempt with inactive account - Email: ${email}, UserID: ${user.id}, IP: ${clientIp}, Time: ${timestamp}`);
        return res.status(403).json({ 
          success: false, 
          error: 'Account is inactive' 
        });
      }

      // Update last login
      await execute(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      console.log(`[Auth] ✓ User logged in - Email: ${email}, Username: ${user.username}, UserID: ${user.id}, IP: ${clientIp}, Time: ${timestamp}`);

      return res.json({ 
        success: true, 
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    } catch (dbError) {
      console.error(`[Auth] ✗ Database error during login - Email: ${email}, Error: ${dbError.message}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error during login' 
      });
    }
  } catch (err) {
    console.error('[Auth] ✗ Unexpected error during login:', err.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};
