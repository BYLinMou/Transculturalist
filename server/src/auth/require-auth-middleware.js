const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// admin-ish client used only to verify the token
const supabaseForVerify = createClient(supabaseUrl, supabaseAnonKey);

async function requireAuth(req, res, next) {
  try {
    if (String(process.env.ENABLE_AUTH).toLowerCase() !== 'true') {
      return next();
    }

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    // 1) verify token
    const { data: { user }, error } = await supabaseForVerify.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    // 2) attach user AND a client that carries this token (so RLS sees auth.uid())
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
