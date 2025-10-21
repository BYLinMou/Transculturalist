// Login/Register Modal Component
// Creates and manages a modal dialog for user authentication

(function() {
  // Create modal HTML
  function createAuthModal() {
    const modalHTML = `
    <div id="authModal" class="fixed inset-0 bg-black bg-opacity-75 hidden z-50" style="display: none; align-items: center; justify-content: center; padding: 1rem; overflow: auto;">
      <div class="bg-gray-900 border border-gold-600 rounded-xl max-w-md w-full shadow-2xl" style="max-height: 90vh; overflow-y: auto; -webkit-overflow-scrolling: touch; margin: auto;">
        <!-- Modal Header (sticky) -->
        <div class="bg-gradient-to-r from-gold-600 to-gold-700 px-6 py-4 border-b border-gold-600 flex justify-between items-center" style="position: sticky; top: 0; z-index: 10;">
          <h2 id="authModalTitle" class="text-title font-bold text-black" data-i18n="login">登入</h2>
          <button onclick="closeAuthModal()" class="text-black hover:text-gray-700 transition-colors" style="background: none; border: none; cursor: pointer; padding: 0;">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Modal Body (scrollable content) -->
        <div class="p-6 space-y-4">
          <!-- Error Message -->
          <div id="authErrorMessage" class="hidden bg-red-900 bg-opacity-30 border border-red-600 text-red-300 px-4 py-3 rounded-lg text-body-sm"></div>

          <!-- Login Form -->
          <div id="loginForm" class="space-y-4">
            <div>
              <label class="block text-body-sm font-medium text-gray-300 mb-2" data-i18n="email">電子郵件</label>
              <input 
                type="email" 
                id="loginEmail" 
                placeholder="your@email.com"
                class="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-body focus:outline-none focus:border-gold-500 transition-colors"
                data-i18n-placeholder="email"
              >
            </div>
            <div>
              <label class="block text-body-sm font-medium text-gray-300 mb-2" data-i18n="password">密碼</label>
              <div class="relative">
                <input 
                  type="password" 
                  id="loginPassword"
                  placeholder="••••••••"
                  class="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-body focus:outline-none focus:border-gold-500 transition-colors pr-10"
                >
                <button 
                  type="button"
                  onclick="togglePasswordVisibility('loginPassword')"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  id="loginPasswordToggle"
                  style="background: none; border: none; cursor: pointer; padding: 0;"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                </button>
              </div>
            </div>
            <button 
              onclick="handleLogin()"
              class="w-full px-4 py-3 bg-gold-600 text-black font-bold rounded-lg hover:bg-gold-700 transition-colors text-body"
              data-i18n="login"
            >
              登入
            </button>
          </div>

          <!-- Register Form (hidden by default) -->
          <div id="registerForm" class="space-y-4 hidden">
            <div>
              <label class="block text-body-sm font-medium text-gray-300 mb-2" data-i18n="usernameRequired">用戶名稱</label>
              <input 
                type="text" 
                id="registerUsername"
                placeholder="文化愛好者"
                class="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-body focus:outline-none focus:border-gold-500 transition-colors"
                data-i18n-placeholder="username"
              >
            </div>
            <div>
              <label class="block text-body-sm font-medium text-gray-300 mb-2" data-i18n="email">電子郵件</label>
              <input 
                type="email" 
                id="registerEmail"
                placeholder="your@email.com"
                class="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-body focus:outline-none focus:border-gold-500 transition-colors"
                data-i18n-placeholder="email"
              >
            </div>
            <div>
              <label class="block text-body-sm font-medium text-gray-300 mb-2" data-i18n="password">密碼</label>
              <div class="relative">
                <input 
                  type="password" 
                  id="registerPassword"
                  placeholder="••••••••"
                  class="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-body focus:outline-none focus:border-gold-500 transition-colors pr-10"
                >
                <button 
                  type="button"
                  onclick="togglePasswordVisibility('registerPassword')"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  id="registerPasswordToggle"
                  style="background: none; border: none; cursor: pointer; padding: 0;"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label class="block text-body-sm font-medium text-gray-300 mb-2" data-i18n="confirmPassword">確認密碼</label>
              <div class="relative">
                <input 
                  type="password" 
                  id="registerConfirmPassword"
                  placeholder="••••••••"
                  class="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-body focus:outline-none focus:border-gold-500 transition-colors pr-10"
                >
                <button 
                  type="button"
                  onclick="togglePasswordVisibility('registerConfirmPassword')"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  id="registerConfirmPasswordToggle"
                  style="background: none; border: none; cursor: pointer; padding: 0;"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                </button>
              </div>
            </div>
            <button 
              onclick="handleRegister()"
              class="w-full px-4 py-3 bg-gold-600 text-black font-bold rounded-lg hover:bg-gold-700 transition-colors text-body"
              data-i18n="register"
            >
              註冊
            </button>
          </div>

          <!-- Form Toggle -->
          <div class="text-center pt-4 border-t border-gray-700">
            <p id="formToggleText" class="text-gray-400 text-body-sm mb-2" data-i18n="noAccount">還沒有帳號？</p>
            <button 
              onclick="toggleAuthForm()"
              id="formToggleBtn"
              class="text-gold-400 hover:text-gold-300 transition-colors text-body font-medium"
              data-i18n="createAccount"
              style="background: none; border: none; cursor: pointer; padding: 0;"
            >
              建立帳號
            </button>
          </div>
        </div>
      </div>
    </div>
    `;

    return modalHTML;
  }

  // Initialize modal
  function initAuthModal() {
    // Add modal to page if not exists
    if (!document.getElementById('authModal')) {
      // Add gold color styles if not already present
      if (!document.getElementById('goldColorStyles')) {
        const style = document.createElement('style');
        style.id = 'goldColorStyles';
        style.innerHTML = `
          .text-gold-300 { color: #ffd700 !important; }
          .text-gold-400 { color: #ffed4e !important; }
          .bg-gold-600 { background-color: #daa520 !important; }
          .bg-gold-700 { background-color: #b8860b !important; }
          .border-gold-600 { border-color: #daa520 !important; }
          .border-gold-500 { border-color: #d4af37 !important; }
          .from-gold-600 { --tw-gradient-from: #daa520; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(218, 165, 32, 0)); }
          .to-gold-700 { --tw-gradient-to: #b8860b; }
          .hover\:bg-gold-700:hover { background-color: #b8860b !important; }
          .hover\:border-gold-500:hover { border-color: #d4af37 !important; }
          .focus\:border-gold-500:focus { border-color: #d4af37 !important; }
        `;
        document.head.appendChild(style);
      }
      
      const container = document.createElement('div');
      container.innerHTML = createAuthModal();
      document.body.appendChild(container.firstElementChild);
    }

    // Add event listeners
    setupAuthModal();
  }

  // Setup event listeners
  function setupAuthModal() {
    // Close modal when clicking outside (on the background)
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        // Only close if clicking on the background (the modal overlay itself)
        // Check if the clicked element is the modal background div and not a child
        if (e.target.id === 'authModal') {
          closeAuthModal();
        }
      });
    }

    // Allow Enter key to submit
    document.getElementById('loginEmail')?.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('loginPassword')?.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('registerEmail')?.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleRegister();
    });
  }

  // Global functions
  window.togglePasswordVisibility = function(fieldId) {
    const field = document.getElementById(fieldId);
    const toggleBtn = document.getElementById(fieldId + 'Toggle');
    
    if (field.type === 'password') {
      field.type = 'text';
      // Change icon to eye with slash (hidden state)
      toggleBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
        </svg>
      `;
    } else {
      field.type = 'password';
      // Change icon back to eye (visible state)
      toggleBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        </svg>
      `;
    }
  };

  window.openAuthModal = function(mode = 'login') {
    // Check if auth is enabled
    if (!window.auth || !window.auth.isAuthEnabled) {
      alert(window.i18next ? window.i18next.t('authDisabled') : '認證功能已停用');
      return;
    }
    
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authModalTitle = document.getElementById('authModalTitle');
    const formToggleText = document.getElementById('formToggleText');
    const formToggleBtn = document.getElementById('formToggleBtn');

    if (mode === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      authModalTitle.setAttribute('data-i18n', 'login');
      authModalTitle.textContent = window.i18next ? window.i18next.t('login') : '登入';
      formToggleText.setAttribute('data-i18n', 'noAccount');
      formToggleText.textContent = window.i18next ? window.i18next.t('noAccount') : '還沒有帳號？';
      formToggleBtn.setAttribute('data-i18n', 'createAccount');
      formToggleBtn.textContent = window.i18next ? window.i18next.t('createAccount') : '建立帳號';
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      authModalTitle.setAttribute('data-i18n', 'register');
      authModalTitle.textContent = window.i18next ? window.i18next.t('register') : '註冊';
      formToggleText.setAttribute('data-i18n', 'haveAccount');
      formToggleText.textContent = window.i18next ? window.i18next.t('haveAccount') : '已有帳號？';
      formToggleBtn.setAttribute('data-i18n', 'login');
      formToggleBtn.textContent = window.i18next ? window.i18next.t('login') : '登入';
    }

    // Clear error message
    const errorMsg = document.getElementById('authErrorMessage');
    errorMsg.classList.add('hidden');
    errorMsg.textContent = '';

    // Clear form fields
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerConfirmPassword').value = '';

    modal.classList.remove('hidden');
    if (mode === 'login') {
      document.getElementById('loginEmail').focus();
    } else {
      document.getElementById('registerUsername').focus();
    }

    // Update page text for newly visible elements
    if (window.updatePageText) {
      window.updatePageText();
    }

    modal.classList.add('hidden');
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
  };

  window.closeAuthModal = function() {
    const modal = document.getElementById('authModal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
  };

  window.toggleAuthForm = function() {
    const loginForm = document.getElementById('loginForm');
    const isLoginMode = !loginForm.classList.contains('hidden');
    window.openAuthModal(isLoginMode ? 'register' : 'login');
  };

  window.handleLogin = function() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('authErrorMessage');
    const loginBtn = event.target;

    // Disable button while processing
    loginBtn.disabled = true;
    loginBtn.textContent = window.i18next ? window.i18next.t('logging') : '登入中...';

    // Call async login function
    Promise.resolve(window.auth.login(email, password)).then(result => {
      if (result.success) {
        errorMsg.classList.add('hidden');
        window.closeAuthModal();
        
        // Show success message
        alert(result.message);
        
        // Reload current page to update auth state
        window.location.reload();
      } else {
        errorMsg.classList.remove('hidden');
        errorMsg.textContent = result.error;
        loginBtn.disabled = false;
        loginBtn.textContent = window.i18next ? window.i18next.t('login') : '登入';
      }
    }).catch(err => {
      console.error('Login error:', err);
      errorMsg.classList.remove('hidden');
      errorMsg.textContent = window.i18next ? window.i18next.t('networkError') : '網絡錯誤，請稍後重試';
      loginBtn.disabled = false;
      loginBtn.textContent = window.i18next ? window.i18next.t('login') : '登入';
    });
  };

  window.handleRegister = function() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const errorMsg = document.getElementById('authErrorMessage');
    const registerBtn = event.target;

    // Validate password match
    if (password !== confirmPassword) {
      errorMsg.classList.remove('hidden');
      errorMsg.textContent = window.i18next ? window.i18next.t('passwordMismatch') : '密碼不符合';
      return;
    }

    // Disable button while processing
    registerBtn.disabled = true;
    registerBtn.textContent = window.i18next ? window.i18next.t('registering') : '註冊中...';

    // Call async register function
    Promise.resolve(window.auth.register(email, password, username)).then(result => {
      if (result.success) {
        errorMsg.classList.add('hidden');
        window.closeAuthModal();
        
        // Show success message
        alert(result.message);
        
        // Reload current page to update auth state
        window.location.reload();
      } else {
        errorMsg.classList.remove('hidden');
        errorMsg.textContent = result.error;
        registerBtn.disabled = false;
        registerBtn.textContent = window.i18next ? window.i18next.t('register') : '註冊';
      }
    }).catch(err => {
      console.error('Register error:', err);
      errorMsg.classList.remove('hidden');
      errorMsg.textContent = window.i18next ? window.i18next.t('networkError') : '網絡錯誤，請稍後重試';
      registerBtn.disabled = false;
      registerBtn.textContent = window.i18next ? window.i18next.t('register') : '註冊';
    });
  };

  // Initialize when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthModal);
  } else {
    initAuthModal();
  }

})();
