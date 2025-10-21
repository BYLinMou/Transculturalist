// Authentication management system
// Manages user login/registration state in localStorage

(function() {
  const AUTH_KEY = 'auth_user';
  const USERS_KEY = 'auth_users'; // Store for registered users

  // Initialize auth system
  function initAuth() {
    // Create global auth object
    window.auth = {
      currentUser: getCurrentUser(),
      
      // Get current logged-in user or null if guest
      getCurrentUser: function() {
        return getCurrentUser();
      },
      
      // Get current user's display name
      getDisplayName: function() {
        const user = this.getCurrentUser();
        if (user) {
          return user.username;
        }
        return window.i18next ? window.i18next.t('cultureLover') : '文化愛好者';
      },
      
      // Get current user's email or 'guest' text
      getDisplayEmail: function() {
        const user = this.getCurrentUser();
        if (user) {
          return user.email;
        }
        return window.i18next ? window.i18next.t('guestMode') : '遊客模式';
      },
      
      // Check if user is logged in
      isLoggedIn: function() {
        return this.getCurrentUser() !== null;
      },
      
      // Register a new user
      register: function(email, password, username) {
        const validation = this.validateInput(email, password);
        if (validation.error) {
          return validation;
        }
        
        // Check if email already exists
        const allUsers = getAllUsers();
        if (allUsers.some(u => u.email === email)) {
          return {
            success: false,
            error: window.i18next ? window.i18next.t('emailExists') : '此電子郵件已被註冊'
          };
        }
        
        // Create new user
        const newUser = {
          email: email,
          password: password, // In production, this should be hashed
          username: username || (window.i18next ? window.i18next.t('cultureLover') : '文化愛好者'),
          createdAt: new Date().toISOString()
        };
        
        // Save to users storage
        allUsers.push(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
        
        // Auto login after registration
        this.login(email, password);
        
        return {
          success: true,
          message: window.i18next ? window.i18next.t('registerSuccess') : '註冊成功！'
        };
      },
      
      // Login user
      login: function(email, password) {
        const validation = this.validateInput(email, password);
        if (validation.error) {
          return validation;
        }
        
        // Find user
        const allUsers = getAllUsers();
        const user = allUsers.find(u => u.email === email && u.password === password);
        
        if (!user) {
          return {
            success: false,
            error: window.i18next ? window.i18next.t('loginFailed') : '登入失敗，請檢查您的電子郵件和密碼'
          };
        }
        
        // Save current user
        const loggedInUser = {
          email: user.email,
          username: user.username,
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
      },
      
      // Logout user
      logout: function() {
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
