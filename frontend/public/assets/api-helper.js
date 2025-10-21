// API Helper with language and authentication support
(function() {
  // Get current user language
  function getCurrentLanguage() {
    return localStorage.getItem('language') || 'zh';
  }

  // Get authentication token from localStorage
  function getAuthToken() {
    try {
      const authUser = localStorage.getItem('auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        return user.token || user.id;
      }
    } catch (e) {
      console.warn('[API Helper] Error parsing auth token:', e);
    }
    return null;
  }

  // Make API request with language parameter and authentication
  async function apiRequest(endpoint, options = {}) {
    const language = getCurrentLanguage();
    const token = getAuthToken();
    
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

    // Add Authorization header if token exists
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
      console.log('[API Helper] Request to', endpoint, 'with auth token');
    } else {
      console.log('[API Helper] Request to', endpoint, 'without auth token (guest mode)');
    }

    return fetch(endpoint, options);
  }

  // Export to global scope
  window.apiHelper = {
    request: apiRequest,
    getCurrentLanguage: getCurrentLanguage,
    getAuthToken: getAuthToken
  };
})();
