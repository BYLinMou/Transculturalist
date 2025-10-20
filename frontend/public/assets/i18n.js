// Simple i18n implementation without external dependencies
(function() {
  const translations = {
    zh: null,
    'zh-Hans': null,
    en: null,
    ja: null,
    ko: null
  };

  // Load translation files
  async function loadTranslations() {
    try {
      const zhResponse = await fetch('/assets/locales/zh.json');
      translations.zh = await zhResponse.json();
      
      const zhHansResponse = await fetch('/assets/locales/zh-Hans.json');
      translations['zh-Hans'] = await zhHansResponse.json();
      
      const enResponse = await fetch('/assets/locales/en.json');
      translations.en = await enResponse.json();
      
      const jaResponse = await fetch('/assets/locales/ja.json');
      translations.ja = await jaResponse.json();
      
      const koResponse = await fetch('/assets/locales/ko.json');
      translations.ko = await koResponse.json();
      
      console.log('Translations loaded successfully');
      // Translations loaded, update page text again if needed
      updatePageText();
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }

  function initI18n() {
    const userLanguage = localStorage.getItem('language') || 'zh';
    
    // If i18next already exists and language hasn't changed, just update text
    if (window.i18next && window.i18next.currentLanguage === userLanguage) {
      updatePageText();
      return;
    }
    
    window.i18next = {
      currentLanguage: userLanguage,
      t: function(key) {
        const lang = this.currentLanguage;
        return translations[lang] && translations[lang][key] || key;
      },
      changeLanguage: function(lang, callback) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        // Update page text immediately, even if translations aren't loaded yet
        updatePageText();
        // Trigger custom event for language change
        window.dispatchEvent(new CustomEvent('i18n-language-changed', { detail: { language: lang } }));
        if (callback) callback(null, this.t.bind(this));
      }
    };

    // Initial page text update (may show keys if translations not loaded yet)
    updatePageText();
  }

  function updatePageText() {
    if (!window.i18next) return;
    
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = window.i18next.t(key);
      if (translation !== key || translations[window.i18next.currentLanguage]) {
        element.textContent = translation;
      }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = window.i18next.t(key);
      if (translation !== key || translations[window.i18next.currentLanguage]) {
        element.placeholder = translation;
      }
    });
  }

  window.updatePageText = updatePageText;
  
  // Initialize i18n immediately
  initI18n();
  
  // Start loading translations asynchronously
  loadTranslations();

  // Handle page visibility changes (when user navigates back/forward)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      // Page became visible again, ensure language is applied
      const currentLang = localStorage.getItem('language') || 'zh';
      if (window.i18next && window.i18next.currentLanguage !== currentLang) {
        window.i18next.currentLanguage = currentLang;
        updatePageText();
      } else if (window.i18next) {
        // Even if language is the same, ensure text is updated in case translations loaded
        updatePageText();
      }
    }
  });

  // Also handle pageshow event for better browser history navigation support
  window.addEventListener('pageshow', function(event) {
    // If page was loaded from cache (like when using back/forward buttons)
    if (event.persisted) {
      const currentLang = localStorage.getItem('language') || 'zh';
      if (window.i18next && window.i18next.currentLanguage !== currentLang) {
        window.i18next.currentLanguage = currentLang;
        updatePageText();
      } else if (window.i18next) {
        updatePageText();
      }
    }
  });

  // Listen for storage changes (when language is changed in another tab/window)
  window.addEventListener('storage', function(event) {
    if (event.key === 'language' && event.newValue !== event.oldValue) {
      if (window.i18next) {
        window.i18next.currentLanguage = event.newValue || 'zh';
        updatePageText();
      }
    }
  });

  // Ensure language is applied when page loads completely
  window.addEventListener('load', function() {
    // Double-check that language is applied after all resources are loaded
    const currentLang = localStorage.getItem('language') || 'zh';
    if (window.i18next && window.i18next.currentLanguage !== currentLang) {
      window.i18next.currentLanguage = currentLang;
    }
    updatePageText();
  });
})();
