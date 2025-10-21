// Authentication management system
// Manages user login/registration state in localStorage

(function() {
  const AUTH_KEY = 'auth_user';
  const USERS_KEY = 'auth_users'; // Store for registered users

  // Initialize auth system
  function initAuth() {
    // First, fetch server configuration to determine if auth is enabled
    fetchServerConfig().then(config => {
      window.appConfig = config;
      
      console.log('[Auth] Server config loaded:', config);
      
      // Create global auth object
      window.auth = {
        isAuthEnabled: config.enableAuth,
        currentUser: config.enableAuth ? getCurrentUser() : null,
        
        // Get current logged-in user or null if guest
        getCurrentUser: function() {
          if (!this.isAuthEnabled) return null;
          return getCurrentUser();
        },
        
        // Get current user's display name
        getDisplayName: function() {
          if (!this.isAuthEnabled) {
            return window.i18next ? window.i18next.t('cultureLover') : '文化愛好者';
          }
          const user = this.getCurrentUser();
          if (user) {
            return user.username;
          }
          return window.i18next ? window.i18next.t('cultureLover') : '文化愛好者';
        },
        
        // Get current user's email or 'guest' text
        getDisplayEmail: function() {
          if (!this.isAuthEnabled) {
            return window.i18next ? window.i18next.t('guestMode') : '遊客模式';
          }
          const user = this.getCurrentUser();
          if (user) {
            return user.email;
          }
          return window.i18next ? window.i18next.t('guestMode') : '遊客模式';
        },
        
        // Check if user is logged in
        isLoggedIn: function() {
          if (!this.isAuthEnabled) return false;
          return this.getCurrentUser() !== null;
        },
        
        // Register a new user
        register: async function(email, password, username) {
          if (!this.isAuthEnabled) {
            return {
              success: false,
              error: window.i18next ? window.i18next.t('authDisabled') : '認證功能已停用'
            };
          }
          
          const validation = this.validateInput(email, password);
          if (validation.error) {
            return validation;
          }
          
          try {
            const response = await fetch('/api/auth/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                email: email,
                password: password,
                username: username || (window.i18next ? window.i18next.t('cultureLover') : '文化愛好者')
              })
            });

            const data = await response.json();

            if (!response.ok) {
              console.error('[Auth] Registration failed:', data.error);
              return {
                success: false,
                error: data.error || (window.i18next ? window.i18next.t('registerFailed') : '註冊失敗')
              };
            }

            console.log('[Auth] Registration successful for:', email);
            
            // Auto login after registration
            return this.login(email, password);
          } catch (error) {
            console.error('[Auth] Registration error:', error);
            return {
              success: false,
              error: window.i18next ? window.i18next.t('networkError') : '網絡錯誤，請稍後重試'
            };
          }
        },
        
        // Login user
        login: async function(email, password) {
          if (!this.isAuthEnabled) {
            return {
              success: false,
              error: window.i18next ? window.i18next.t('authDisabled') : '認證功能已停用'
            };
          }
          
          const validation = this.validateInput(email, password);
          if (validation.error) {
            return validation;
          }
          
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                email: email,
                password: password
              })
            });

            const data = await response.json();

            if (!response.ok) {
              console.error('[Auth] Login failed:', data.error);
              return {
                success: false,
                error: data.error || (window.i18next ? window.i18next.t('loginFailed') : '登入失敗，請檢查您的電子郵件和密碼')
              };
            }

            console.log('[Auth] Login successful for:', email);
            
            // Save current user
            const loggedInUser = {
              id: data.user.id,
              email: data.user.email,
              username: data.user.username,
              loginTime: new Date().toISOString()
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(loggedInUser));
            this.currentUser = loggedInUser;
            
            // Dispatch event
            window.dispatchEvent(new Event('auth-changed'));
            
            return {
              success: true,
              message: window.i18next ? window.i18next.t('loginSuccess') : '登入成功！',
              user: loggedInUser
            };
          } catch (error) {
            console.error('[Auth] Login error:', error);
            return {
              success: false,
              error: window.i18next ? window.i18next.t('networkError') : '網絡錯誤，請稍後重試'
            };
          }
        },
        
        // Logout user
        logout: function() {
          if (!this.isAuthEnabled) {
            return {
              success: false,
              error: window.i18next ? window.i18next.t('authDisabled') : '認證功能已停用'
            };
          }
          
          localStorage.removeItem(AUTH_KEY);
          this.currentUser = null;
          
          // Dispatch event
          window.dispatchEvent(new Event('auth-changed'));
          
          return {
            success: true,
            message: window.i18next ? window.i18next.t('logout') : '已登出'
          };
        },
        
        // Update user profile (except email which is not changeable)
        updateProfile: function(username) {
          if (!this.isAuthEnabled) {
            return {
              success: false,
              error: window.i18next ? window.i18next.t('authDisabled') : '認證功能已停用'
            };
          }
          
          const user = this.getCurrentUser();
          if (!user) {
            return {
              success: false,
              error: '需要先登入'
            };
          }
          
          // Update in users storage
          const allUsers = getAllUsers();
          const userIndex = allUsers.findIndex(u => u.email === user.email);
          if (userIndex >= 0) {
            allUsers[userIndex].username = username;
            localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
          }
          
          // Update current user
          user.username = username;
          localStorage.setItem(AUTH_KEY, JSON.stringify(user));
          this.currentUser = user;
          
          // Dispatch event
          window.dispatchEvent(new Event('auth-changed'));
          
          return {
            success: true,
            message: window.i18next ? window.i18next.t('settingsSaved') : '設定已保存'
          };
        },
        
        // Validate email and password input
        validateInput: function(email, password) {
          if (!email) {
            return {
              error: window.i18next ? window.i18next.t('emailRequired') : '請輸入電子郵件'
            };
          }
          
          // Simple email validation - must contain @
          if (!email.includes('@')) {
            return {
              error: window.i18next ? window.i18next.t('invalidEmail') : '請輸入有效的電子郵件（需包含@符號）'
            };
          }
          
          if (!password) {
            return {
              error: window.i18next ? window.i18next.t('passwordRequired') : '請輸入密碼'
            };
          }
          
          return { error: null };
        },
        
        // Clear all user data
        clearAllData: function() {
          localStorage.removeItem(AUTH_KEY);
          localStorage.removeItem(USERS_KEY);
          this.currentUser = null;
          window.dispatchEvent(new Event('auth-changed'));
        }
      };
      
      // Dispatch event to notify other components that auth is ready
      console.log('[Auth] Auth initialization complete, dispatching auth-ready event');
      window.dispatchEvent(new Event('auth-ready'));
    }).catch(err => {
      console.error('[Auth] Failed to load server config, defaulting to guest mode:', err);
      // Default to guest mode if config fetch fails
      window.appConfig = { enableAuth: false };
      
      window.auth = {
        isAuthEnabled: false,
        currentUser: null,
        getCurrentUser: function() { return null; },
        getDisplayName: function() { 
          return window.i18next ? window.i18next.t('cultureLover') : '文化愛好者'; 
        },
        getDisplayEmail: function() { 
          return window.i18next ? window.i18next.t('guestMode') : '遊客模式'; 
        },
        isLoggedIn: function() { return false; },
        register: function() { 
          return { success: false, error: '認證功能已停用' }; 
        },
        login: function() { 
          return { success: false, error: '認證功能已停用' }; 
        },
        logout: function() { 
          return { success: false, error: '認證功能已停用' }; 
        },
        updateProfile: function() { 
          return { success: false, error: '認證功能已停用' }; 
        },
        validateInput: function(email, password) {
          if (!email) {
            return {
              error: window.i18next ? window.i18next.t('emailRequired') : '請輸入電子郵件'
            };
          }
          
          // Simple email validation - must contain @
          if (!email.includes('@')) {
            return {
              error: window.i18next ? window.i18next.t('invalidEmail') : '請輸入有效的電子郵件（需包含@符號）'
            };
          }
          
          if (!password) {
            return {
              error: window.i18next ? window.i18next.t('passwordRequired') : '請輸入密碼'
            };
          }
          
          return { error: null };
        },
        clearAllData: function() {
          localStorage.removeItem(AUTH_KEY);
          localStorage.removeItem(USERS_KEY);
          this.currentUser = null;
          window.dispatchEvent(new Event('auth-changed'));
        }
      };
      
      // Dispatch event to notify other components that auth is ready (even in error state)
      console.log('[Auth] Auth initialization complete (error fallback), dispatching auth-ready event');
      window.dispatchEvent(new Event('auth-ready'));
    });
  }

  // Fetch server configuration
  function fetchServerConfig() {
    console.log('[Auth] Fetching server config from /api/config');
    return fetch('/api/config')
      .then(response => {
        console.log('[Auth] Server config response status:', response.status);
        if (!response.ok) {
          throw new Error('Failed to fetch server config');
        }
        return response.json();
      })
      .then(data => {
        console.log('[Auth] Server config data:', data);
        return data;
      })
      .catch(err => {
        console.error('[Auth] Error fetching server config:', err);
        // Return default config (guest mode) if fetch fails
        return { enableAuth: false, port: 3030 };
      });
  }

  // Get current user from storage
  function getCurrentUser() {
    const stored = localStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  // Get all registered users
  function getAllUsers() {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }

  // Re-initialize auth when language changes (for error messages)
  window.addEventListener('storage', function(e) {
    if (e.key === 'language') {
      // Auth system will use updated i18n when messages are displayed
    }
  });

})();
