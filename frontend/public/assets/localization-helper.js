/**
 * Localization Helper - Shared utility for handling i18n JSON data
 * This module provides functions to extract and return localized text
 * from i18n JSON fields based on the current language setting.
 */

/**
 * Extract localized text from i18n JSON field
 * @param {string|object} i18nJson - The i18n JSON data (can be string or object)
 * @param {string} defaultText - Default text to return if i18nJson is not available
 * @param {string} fallbackLang - Fallback language code (default: 'zh')
 * @returns {string} The localized text
 */
function getLocalizedText(i18nJson, defaultText, fallbackLang = 'zh') {
  if (!i18nJson) return defaultText;
  
  try {
    const translations = typeof i18nJson === 'string' ? JSON.parse(i18nJson) : i18nJson;
    const currentLang = window.i18next?.currentLanguage || 'zh';
    
    // Try to get text in current language
    if (translations[currentLang]) {
      return translations[currentLang];
    }
    
    // Fallback to default language
    if (translations[fallbackLang]) {
      return translations[fallbackLang];
    }
    
    // Use first available translation
    const firstKey = Object.keys(translations)[0];
    if (firstKey && translations[firstKey]) {
      return translations[firstKey];
    }
  } catch (error) {
    console.error('Failed to parse i18n JSON:', error, i18nJson);
  }
  
  return defaultText;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getLocalizedText };
}
