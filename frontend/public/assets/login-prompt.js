// Login Prompt Banner Component
// Shows a prompt banner for guest users to encourage login

(function() {
  function createLoginPromptBanner() {
    const bannerHTML = `
    <div id="loginPromptBanner" class="hidden bg-gradient-to-r from-gold-700 to-gold-600 px-4 py-4 border-b border-gold-500 shadow-lg">
      <div class="container mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 flex-1">
          <svg class="w-5 h-5 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p id="loginPromptText" class="text-black text-body font-medium" data-i18n="loginPrompt">
            你目前以遊客身份遊覽平台，立即登入以保存你的進度和成就！
          </p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button 
            onclick="openAuthModal('login')"
            class="px-4 py-2 bg-black text-gold-400 font-bold rounded-lg hover:bg-gray-900 transition-colors text-body-sm"
            data-i18n="login"
          >
            登入
          </button>
          <button 
            onclick="closeLoginPromptBanner()"
            class="p-2 text-black hover:bg-gold-600 rounded-lg transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    `;

    return bannerHTML;
  }

  function initLoginPromptBanner() {
    console.log('[LoginPrompt] Initializing login prompt banner');
    
    // Add banner to page if not exists (should be added after header)
    if (!document.getElementById('loginPromptBanner')) {
      const header = document.querySelector('header');
      if (header) {
        const bannerContainer = document.createElement('div');
        bannerContainer.innerHTML = createLoginPromptBanner();
        header.insertAdjacentElement('afterend', bannerContainer.firstElementChild);
        console.log('[LoginPrompt] Banner added to DOM');
      } else {
        console.warn('[LoginPrompt] Header not found');
      }
    }

    // Show/hide banner based on auth state
    updateLoginPromptBanner();
  }

  function updateLoginPromptBanner() {
    const banner = document.getElementById('loginPromptBanner');
    if (!banner) return;

    console.log('[LoginPrompt] updateLoginPromptBanner called');
    console.log('[LoginPrompt] window.auth:', window.auth);
    
    // Wait for auth to be initialized if not ready
    if (!window.auth || window.auth.isAuthEnabled === undefined) {
      console.log('[LoginPrompt] Auth not ready, waiting...');
      setTimeout(updateLoginPromptBanner, 100);
      return;
    }

    // Only show banner if auth is enabled AND user is not logged in
    if (window.auth.isAuthEnabled && !window.auth.isLoggedIn()) {
      console.log('[LoginPrompt] Showing banner - auth enabled and not logged in');
      banner.classList.remove('hidden');
      // Update text in case language changed
      if (window.updatePageText) {
        window.updatePageText();
      }
    } else {
      console.log('[LoginPrompt] Hiding banner - auth disabled or user logged in');
      banner.classList.add('hidden');
    }
  }

  window.closeLoginPromptBanner = function() {
    const banner = document.getElementById('loginPromptBanner');
    if (banner) {
      banner.classList.add('hidden');
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPromptBanner);
  } else {
    initLoginPromptBanner();
  }

  // Listen for auth initialization
  window.addEventListener('auth-ready', function() {
    console.log('[LoginPrompt] auth-ready event received, updating banner');
    updateLoginPromptBanner();
  });

  // Listen for auth changes to update banner
  window.addEventListener('auth-changed', updateLoginPromptBanner);

  // Also check when language changes
  window.addEventListener('storage', function(e) {
    if (e.key === 'language') {
      setTimeout(updateLoginPromptBanner, 100);
    }
  });

})();
