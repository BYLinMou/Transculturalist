const express = require('express');
const router = express.Router();

router.post('/profile/init', async (req, res) => {
  const user = req.user;
  const supabase = req.supabase; // <-- use the user-scoped client
  const DEFAULT_NAME = '文化爱好者';
  const displayName = req.body.display_name || DEFAULT_NAME;
  const avatarUrl   = req.body.avatar_url || null;

  // check if exists
  const { data: exist, error: selErr } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (selErr) return res.status(500).json({ error: selErr.message });
  if (exist) return res.json({ ok: true, created: false });

  const { error: insErr } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, display_name: displayName, avatar_url: avatarUrl });
  if (insErr) return res.status(500).json({ error: insErr.message });

  res.json({ ok: true, created: true });
});

module.exports = router;