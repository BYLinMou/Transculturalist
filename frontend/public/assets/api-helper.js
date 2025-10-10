// API Helper with language support
(function() {
  // Get current user language
  function getCurrentLanguage() {
    return localStorage.getItem('language') || 'zh';
  }

  // Make API request with language parameter
  async function apiRequest(endpoint, options = {}) {
    const language = getCurrentLanguage();
    
    // Merge language into request body or query params
    if (options.method === 'POST' || options.method === 'PUT') {
      const body = options.body ? JSON.parse(options.body) : {};
      body.language = language;
      options.body = JSON.stringify(body);
    } else {
      // For GET requests, add language as query parameter
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.append('language', language);
      endpoint = url.pathname + url.search;
    }

    // Ensure headers include Content-Type
    options.headers = options.headers || {};
    if (options.method === 'POST' || options.method === 'PUT') {
      options.headers['Content-Type'] = 'application/json';
    }

    return fetch(endpoint, options);
  }

  // Export to global scope
  window.apiHelper = {
    request: apiRequest,
    getCurrentLanguage: getCurrentLanguage
  };
})();
