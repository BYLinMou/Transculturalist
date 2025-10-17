// frontend/public/components/supabase-client.js
// 作用：在浏览器创建一个全局 Supabase 客户端（window.supabase）
//      注意：anon key 放前端是正常做法，service_role key 绝对不要放前端

// 以后任意页面只要引入这份脚本，就能用 window.supabase 和 authFetch()。

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 把下面两个值换成项目的真实值（和 server/.env 对应的同一项目）
const SUPABASE_URL = 'https://lekfuecgfvntgcjowzhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxla2Z1ZWNnZnZudGdjam93emhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDQ5MTUsImV4cCI6MjA3NjEyMDkxNX0.4BSDsAwBr5TYrTe4xxy4pML0OW_ESz7wuB8Fn2PDY1E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 让控制台和其它脚本能访问
window.supabase = supabase;

// 导出一个小工具：带 JWT 的 fetch
export async function authFetch(path, init = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('not logged in');
  return fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` }
  });
}
