// Load header component dynamically
document.addEventListener('DOMContentLoaded', async () => {
  const headerContainer = document.querySelector('header');
  if (headerContainer && !headerContainer.hasAttribute('data-loaded')) {
    try {
      const response = await fetch('/components/header.html');
      const html = await response.text();
      headerContainer.outerHTML = html;
      
      // Wait a bit for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Initialize language functionality immediately
      initLanguageSwitcher();
      
      // Ensure language is applied after header is loaded
      if (window.updatePageText) {
        window.updatePageText();
      }
      
    } catch (error) {
      console.error('Failed to load header:', error);
    }
  }
});

function initLanguageSwitcher() {
  const languageBtn = document.getElementById('languageBtn');
  const languageDropdown = document.getElementById('languageDropdown');

  console.log('Initializing language switcher...', { languageBtn, languageDropdown });

  if (languageBtn && languageDropdown) {
    // Toggle dropdown
    languageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Language button clicked!');
      languageDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      languageDropdown.classList.add('hidden');
    });

    // Language selection
    languageDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = e.target.dataset.lang;
      console.log('Language selected:', lang);
      if (lang) {
        if (lang === 'auto') {
          enableGoogleTranslate();
        } else {
          switchLanguage(lang);
        }
        languageDropdown.classList.add('hidden');
      }
    });
  } else {
    console.error('Language elements not found!', { languageBtn, languageDropdown });
  }
}

function switchLanguage(lang) {
  localStorage.setItem('language', lang);
  if (window.i18next && window.i18next.changeLanguage) {
    window.i18next.changeLanguage(lang, (err, t) => {
      if (err) return console.error('Language change error:', err);
      if (window.updatePageText) {
        window.updatePageText();
      }
    });
  } else {
    console.error('i18next not loaded yet, waiting...');
    // Wait for i18next to load
    const checkI18n = setInterval(() => {
      if (window.i18next && window.i18next.changeLanguage) {
        clearInterval(checkI18n);
        window.i18next.changeLanguage(lang, (err, t) => {
          if (err) return console.error('Language change error:', err);
          if (window.updatePageText) {
            window.updatePageText();
          }
        });
      }
    }, 100);
  }
}

function enableGoogleTranslate() {
  if (!document.getElementById('google-translate-script')) {
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(script);

    window.googleTranslateElementInit = function() {
      new google.translate.TranslateElement({
        pageLanguage: 'zh-TW',
        includedLanguages: 'zh-CN,zh-TW,en,ja,ko,es,fr,de',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE
      }, 'google_translate_element');
    };

    const translateDiv = document.createElement('div');
    translateDiv.id = 'google_translate_element';
    translateDiv.style.position = 'fixed';
    translateDiv.style.top = '10px';
    translateDiv.style.right = '10px';
    translateDiv.style.zIndex = '1000';
    document.body.appendChild(translateDiv);
  }
}
