const express = require('express');
const router = express.Router();

router.get('/me', async (req, res) => {
  const user = req.user;
  const supabase = req.supabase;

  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  if (!profile) { // 自动建档（可带默认昵称）
    const defaultName = user.email?.split('@')[0] || null;
    const { error: insErr } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, display_name: defaultName });
    if (insErr) return res.status(500).json({ error: insErr.message });

    // 重新查询一次返回
    const r2 = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    profile = r2.data || null;
  }

  res.json({ user, profile });
});

module.exports = router;
