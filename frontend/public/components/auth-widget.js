// frontend/public/components/auth-widget.js
// Purpose: Render a small widget on the page, displaying the current user, login/logout buttons, test buttons, etc.
import { authFetch } from './supabase-client.js';

function html(strings, ...vals){ return strings.map((s,i)=>s+(vals[i]??'')).join(''); }

async function render(container) {
  const { data: { user } } = await window.supabase.auth.getUser();
  
  // Get translated text using i18next
  const t = (key, fallback) => {
    if (window.i18next && typeof window.i18next.t === 'function') {
      const result = window.i18next.t(key);
      // If result is not the key itself, translation is loaded
      if (result && result !== key) {
        return result;
      }
    }
    return fallback;
  };
  
  const anonymousText = t('anonymous', '匿名');
  const loginStatusText = t('loginStatus', '登入狀態');
  const logoutText = t('logout', '登出');
  const testApiText = t('testApi', '測試 API');
  const signupText = t('signup', '註冊');
  const loginText = t('login', '登入');
  const emailPlaceholder = t('emailPlaceholder', 'email');
  const passwordPlaceholder = t('passwordPlaceholder', 'password');
  
  // console.log('auth-widget render - loginStatusText:', loginStatusText, 'currentLanguage:', window.i18next?.currentLanguage);

  container.innerHTML = html`
    <style>
        .auth-widget { display:flex; gap:8px; align-items:center; flex-wrap:wrap; font: 14px/1.4 system-ui; }
        .auth-email { opacity:.85 }
        /* Key change: Force buttons and inputs to use dark text to avoid being affected by global text-white */
        .auth-btn, .auth-input {
        padding:6px 10px;
        border:1px solid #ccc;
        border-radius:6px;
        background:#fff !important;
        color:#111 !important;
        }
        .auth-btn { cursor:pointer; }
    </style>
    <div class="auth-widget">
        <span>${loginStatusText}：</span>
        <span class="auth-email">${user ? user.email : anonymousText}</span>
        ${user ? `
        <button type="button" class="auth-btn" id="btn-logout">${logoutText}</button>
        <button type="button" class="auth-btn" id="btn-me">${testApiText}</button>
        ` : `
        <input class="auth-input" id="in-email" placeholder="${emailPlaceholder}" />
        <input class="auth-input" id="in-pass" type="password" placeholder="${passwordPlaceholder}" />
        <button type="button" class="auth-btn" id="btn-signup">${signupText}</button>
        <button type="button" class="auth-btn" id="btn-login">${loginText}</button>
        `}
    </div>
    <pre id="auth-log" style="margin-top:8px; white-space:pre-wrap; padding:8px; border:1px solid #eee; max-width:680px; background:#fff; color:#111;"></pre>
    `;

  const log = (v)=> container.querySelector('#auth-log').textContent =
    typeof v==='string' ? v : JSON.stringify(v, null, 2);

  if (!user) {
    container.querySelector('#btn-signup').onclick = async () => {
      const email = container.querySelector('#in-email').value;
      const password = container.querySelector('#in-pass').value;
      const { data, error } = await window.supabase.auth.signUp({ email, password });
      log(error ? error.message : data);
    };
    container.querySelector('#btn-login').onclick = async () => {
      const email = container.querySelector('#in-email').value;
      const password = container.querySelector('#in-pass').value;
      const { data, error } = await window.supabase.auth.signInWithPassword({ email, password });
      log(error ? error.message : { tokenStart: data?.session?.access_token?.slice(0,24)+'...' });
      if (!error) location.reload(); // Refresh to update widget display
    };
  } else {
    container.querySelector('#btn-logout').onclick = async () => {
      // Clear saved email and related information
      localStorage.removeItem('email');
      localStorage.removeItem('username');
      await window.supabase.auth.signOut();
      location.reload();
    };
    container.querySelector('#btn-me').onclick = async () => {
      const r = await authFetch('/api/auth/me');
      log(await r.json());
    };
  }
}

// Wait for i18next to be ready
async function waitForI18n() {
  return new Promise((resolve) => {
    const checkI18n = setInterval(() => {
      if (window.i18next && typeof window.i18next.t === 'function') {
        const testTranslation = window.i18next.t('loginStatus');
        // If translation is loaded (not just returning the key)
        if (testTranslation && testTranslation !== 'loginStatus') {
          clearInterval(checkI18n);
          resolve();
          return;
        }
      }
    }, 100);
    
    // Timeout after 3 seconds
    setTimeout(() => {
      clearInterval(checkI18n);
      console.warn('auth-widget: i18next timeout, rendering with fallbacks');
      resolve();
    }, 3000);
  });
}

// Automatically render on elements with #auth-widget
window.addEventListener('DOMContentLoaded', async ()=>{
  const host = document.querySelector('#auth-widget');
  if (host) {
    await waitForI18n();
    await render(host);
  }
});

// Also listen for load event to ensure rendering after all resources are loaded
window.addEventListener('load', async ()=>{
  const host = document.querySelector('#auth-widget');
  if (host && !host.querySelector('.auth-widget')) {
    // If widget hasn't been rendered yet, render it now
    await waitForI18n();
    await render(host);
  }
});

// Listen for language change events, re-render to update translations
window.addEventListener('i18n-language-changed', async () => {
  const host = document.querySelector('#auth-widget');
  if (host) {
    // console.log('auth-widget: Language changed, re-rendering');
    // Wait a bit for translations to update
    await new Promise(resolve => setTimeout(resolve, 50));
    render(host);
  }
});

// Also export a manual rendering function (optional)
export function mountAuthWidget(el){ render(el); }
