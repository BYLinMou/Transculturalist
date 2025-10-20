// frontend/public/components/auth-widget.js
// 作用：在页面上渲染一个小部件，显示当前用户、登录/登出按钮、测试按钮等
import { authFetch } from './supabase-client.js';

function html(strings, ...vals){ return strings.map((s,i)=>s+(vals[i]??'')).join(''); }

async function render(container) {
  const { data: { user } } = await window.supabase.auth.getUser();
  
  // Get the translated "anonymous" text
  const getAnonymousText = () => {
    return window.i18next?.t('anonymous') || '匿名';
  };
  const anonymousText = getAnonymousText();

  container.innerHTML = html`
    <style>
        .auth-widget { display:flex; gap:8px; align-items:center; flex-wrap:wrap; font: 14px/1.4 system-ui; }
        .auth-email { opacity:.85 }
        /* 关键改动：强制按钮与输入用深色文字，避免被全局 text-white 影响 */
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
        <span>登録状態：</span>
        <span class="auth-email">${user ? user.email : anonymousText}</span>
        ${user ? `
        <button type="button" class="auth-btn" id="btn-logout">退出</button>
        <button type="button" class="auth-btn" id="btn-me">测试 /api/auth/me</button>
        ` : `
        <input class="auth-input" id="in-email" placeholder="email" />
        <input class="auth-input" id="in-pass" type="password" placeholder="password" />
        <button type="button" class="auth-btn" id="btn-signup">注册</button>
        <button type="button" class="auth-btn" id="btn-login">登录</button>
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
      if (!error) location.reload(); // 刷新以更新部件显示
    };
  } else {
    container.querySelector('#btn-logout').onclick = async () => {
      // 清除保存的 email 和相關資訊
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

// 自动在有 #auth-widget 的元素上渲染
window.addEventListener('DOMContentLoaded', ()=>{
  const host = document.querySelector('#auth-widget');
  if (host) render(host);
});

// 也导出一个手动渲染函数（可选）
export function mountAuthWidget(el){ render(el); }
