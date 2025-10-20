const express = require('express');
const router = express.Router();

const DEFAULT_NAME = '文化爱好者';

router.get('/me', async (req, res) => {
  const user = req.user;
  const supabase = req.supabase;

  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  if (!profile) { // Auto-create profile (with default nickname if needed)
    const defaultName = DEFAULT_NAME;
    const { error: insErr } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, display_name: defaultName });
    if (insErr) return res.status(500).json({ error: insErr.message });

    // Query again to return the new profile
    const r2 = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    profile = r2.data || null;
  }

  res.json({ user, profile });
});

router.patch('/me', async (req, res) => {
  const user = req.user;
  const supabase = req.supabase;
  const rawName = typeof req.body.display_name === 'string' ? req.body.display_name.trim() : '';
  const displayName = rawName || DEFAULT_NAME;

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, display_name: displayName }, { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ profile: data });
});

module.exports = router;