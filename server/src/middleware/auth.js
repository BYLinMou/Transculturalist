/**
 * Authentication middleware
 * Verifies user authentication and attaches user info to req.user
 */

const { queryOne } = require('../db/connection');

/**
 * Main authentication middleware
 * Checks for user ID in Authorization header (Bearer token format)
 * Authorization: Bearer {userId}
 */
async function authMiddleware(req, res, next) {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // No auth header, continue without user (will be handled by route)
      console.log('[Auth Middleware] No auth header provided');
      return next();
    }

    // Parse authorization header: "Bearer {userId}"
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const userId = parseInt(token);
      
      if (isNaN(userId) || userId <= 0) {
        // Invalid user ID format
        console.log('[Auth Middleware] Invalid token format:', token);
        return next();
      }

      // Fetch user from database to verify they exist
      try {
        const user = await queryOne(
          'SELECT id, email, username FROM users WHERE id = ?',
          [userId]
        );

        if (user) {
          // Attach user info to request
          req.user = {
            id: user.id,
            email: user.email,
            username: user.username
          };
          console.log(`[Auth Middleware] User authenticated: ID=${userId}, Email=${user.email}`);
        } else {
          console.log(`[Auth Middleware] User not found in database: ID=${userId}`);
        }
      } catch (dbError) {
        console.error('[Auth Middleware] Database error fetching user:', dbError.message);
        // Continue without user - let the route handle authentication
      }
    }

    next();
  } catch (err) {
    console.error('[Auth Middleware] Unexpected error:', err.message);
    next();
  }
}

/**
 * Middleware to require authentication
 * Use this to protect routes that require authentication
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  next();
}

module.exports = {
  authMiddleware,
  requireAuth
};
