// frontend/public/components/supabase-client.js
// Purpose: Create a global Supabase client (window.supabase) in the browser
// Note: Putting anon key in frontend is normal practice, service_role key absolutely should not be put in frontend

// In the future, any page that introduces this script can use window.supabase and authFetch().

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Replace the two values below with the real values of the project (the same project corresponding to server/.env)
const SUPABASE_URL = 'https://lekfuecgfvntgcjowzhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxla2Z1ZWNnZnZudGdjam93emhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDQ5MTUsImV4cCI6MjA3NjEyMDkxNX0.4BSDsAwBr5TYrTe4xxy4pML0OW_ESz7wuB8Fn2PDY1E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Allow console and other scripts to access
window.supabase = supabase;

// Export a small tool: fetch with JWT
export async function authFetch(path, init = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('not logged in');
  return fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` }
  });
}
