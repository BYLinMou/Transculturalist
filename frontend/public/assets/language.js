// Language switching functionality
document.addEventListener('DOMContentLoaded', () => {
  const languageBtn = document.getElementById('languageBtn');
  const languageDropdown = document.getElementById('languageDropdown');

  if (languageBtn && languageDropdown) {
    // Toggle dropdown
    languageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      languageDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      languageDropdown.classList.add('hidden');
    });

    // Language selection
    languageDropdown.addEventListener('click', (e) => {
      const lang = e.target.dataset.lang;
      if (lang) {
        if (lang === 'auto') {
          // Enable Google Translate
          enableGoogleTranslate();
        } else {
          // Switch language
          switchLanguage(lang);
        }
        languageDropdown.classList.add('hidden');
      }
    });
  }
});

function switchLanguage(lang) {
  localStorage.setItem('language', lang);
  window.i18next.changeLanguage(lang, (err, t) => {
    if (err) return console.error('Language change error:', err);
    window.updatePageText();
  });
}

function enableGoogleTranslate() {
  // Add Google Translate widget
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

    // Add translate element container
    const translateDiv = document.createElement('div');
    translateDiv.id = 'google_translate_element';
    translateDiv.style.position = 'fixed';
    translateDiv.style.top = '10px';
    translateDiv.style.right = '10px';
    translateDiv.style.zIndex = '1000';
    document.body.appendChild(translateDiv);
  }
}