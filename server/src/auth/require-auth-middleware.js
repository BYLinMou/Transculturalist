const { createClient } = require('@supabase/supabase-js');
const config = require('../config-loader');

async function requireAuth(req, res, next) {
  try {
    const supabaseUrl = config.SUPABASE_URL;
    const supabaseAnonKey = config.SUPABASE_ANON_KEY;

    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    // If auth is disabled, create a client without authentication
    // Use a default user ID for unauthenticated requests
    if (String(config.ENABLE_AUTH).toLowerCase() !== 'true') {
      req.supabase = createClient(supabaseUrl, supabaseAnonKey);
      req.user = { id: 'anonymous' }; // Default user for unauthenticated mode
      return next();
    }

    // Create client for token verification
    const supabaseForVerify = createClient(supabaseUrl, supabaseAnonKey);

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    // 1) Verify token
    const { data: { user }, error } = await supabaseForVerify.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    // 2) Attach user AND a client that carries this token (so RLS sees auth.uid())
    req.user = user;
    req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    next();
  } catch {
    res.status(401).json({ error: 'Auth failed' });
  }
}

module.exports = { requireAuth };
