/**
 * Guest Game Data Display Utility
 * 
 * Provides UI components and utilities to display guest game statistics
 * and records in the settings page or game selection screen.
 */

(function() {
  /**
   * Format seconds to readable time string
   * @param {number} seconds
   * @returns {string} Formatted time (e.g., "1:23:45" for hours:minutes:seconds)
   */
  function formatPlayTime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Create a guest statistics display card
   * @returns {HTMLElement} Statistics card element
   */
  function createGuestStatsCard() {
    const container = document.createElement('div');
    container.id = 'guest-stats-card';
    container.className = 'bg-gray-900 bg-opacity-80 p-6 rounded-xl border border-gold-300 border-opacity-30 mt-6';
    
    const stats = window.GuestGameStorage?.getStatistics() || {};
    
    container.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-title font-bold text-gold-300" data-i18n="guestGameStats">游客游戏数据</h3>
        <span class="text-body-sm text-gray-400">
          <span data-i18n="sessionData">会话数据</span> (
          <span data-i18n="clearedOnClose">关闭窗口后清除</span>)
        </span>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-gray-800 p-4 rounded-lg">
          <div class="text-body-sm text-gray-400 mb-1" data-i18n="totalPlayTime">总游玩时间</div>
          <div class="text-title-lg font-bold text-gold-300">${formatPlayTime(stats.total_play_time || 0)}</div>
        </div>
        
        <div class="bg-gray-800 p-4 rounded-lg">
          <div class="text-body-sm text-gray-400 mb-1" data-i18n="totalGames">总游戏数</div>
          <div class="text-title-lg font-bold text-gold-300">${stats.total_games_played || 0}</div>
        </div>
        
        <div class="bg-gray-800 p-4 rounded-lg">
          <div class="text-body-sm text-gray-400 mb-1" data-i18n="completedGames">完成游戏</div>
          <div class="text-title-lg font-bold text-gold-300">${stats.completed_games || 0}</div>
        </div>
        
        <div class="bg-gray-800 p-4 rounded-lg">
          <div class="text-body-sm text-gray-400 mb-1" data-i18n="highestScore">最高分</div>
          <div class="text-title-lg font-bold text-gold-300">${(stats.highest_score || 0).toFixed(0)}</div>
        </div>
      </div>

      <div id="guest-game-details" class="mt-6">
        <!-- Game type details will be inserted here -->
      </div>
    `;
    
    return container;
  }

  /**
   * Create detailed breakdown by game type
   * @returns {HTMLElement} Game details element
   */
  function createGameTypeDetails() {
    const container = document.createElement('div');
    const stats = window.GuestGameStorage?.getStatistics() || {};
    const gamesByType = stats.games_by_type || {};
    
    if (Object.keys(gamesByType).length === 0) {
      container.innerHTML = `
        <p class="text-body text-gray-400 text-center py-4" data-i18n="noGameData">暂无游戏数据</p>
      `;
      return container;
    }
    
    const gameNames = {
      'mcq': '文化问答',
      'matching': '配对游戏',
      'roleplay': '角色扮演',
      'story': '故事探索'
    };
    
    container.innerHTML = '<h4 class="text-title font-bold text-gold-300 mb-3" data-i18n="gameTypeBreakdown">游戏类型详情</h4>';
    
    const list = document.createElement('div');
    list.className = 'space-y-3';
    
    Object.entries(gamesByType).forEach(([gameId, gameData]) => {
      const gameCard = document.createElement('div');
      gameCard.className = 'bg-gray-800 p-3 rounded-lg border border-gray-700';
      
      const gameName = gameNames[gameId] || gameId;
      const completionRate = gameData.count > 0 
        ? Math.round((gameData.completed / gameData.count) * 100) 
        : 0;
      
      gameCard.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <h5 class="text-body font-semibold text-gold-300">${gameName}</h5>
          <span class="text-body-sm text-gray-400">${gameData.completed}/${gameData.count}</span>
        </div>
        <div class="grid grid-cols-3 gap-2 text-body-sm">
          <div>
            <span class="text-gray-500">时间:</span>
            <span class="text-gold-300">${formatPlayTime(gameData.total_time || 0)}</span>
          </div>
          <div>
            <span class="text-gray-500">完成率:</span>
            <span class="text-gold-300">${completionRate}%</span>
          </div>
          <div>
            <span class="text-gray-500">平均分:</span>
            <span class="text-gold-300">${(gameData.average_score || 0).toFixed(1)}</span>
          </div>
        </div>
      `;
      
      list.appendChild(gameCard);
    });
    
    container.appendChild(list);
    return container;
  }

  /**
   * Insert guest stats display in settings page
   * Should be called after the main settings form is loaded
   * @param {string} insertAfterId - ID of the element after which to insert stats
   */
  function insertGuestStatsInSettings(insertAfterId = 'settings-form') {
    // Check if user is logged in
    const isLoggedIn = window.auth && window.auth.isLoggedIn && window.auth.isLoggedIn();
    
    if (isLoggedIn) {
      console.log('[GuestGameDisplay] User is logged in, skipping guest stats display');
      return;
    }

    // Wait for DOM to be ready if needed
    const insertPoint = document.getElementById(insertAfterId);
    if (!insertPoint) {
      console.warn(`[GuestGameDisplay] Could not find element with id: ${insertAfterId}`);
      return;
    }

    // Remove any existing guest stats card
    const existing = document.getElementById('guest-stats-card');
    if (existing) {
      existing.remove();
    }

    // Create and insert the stats card
    const statsCard = createGuestStatsCard();
    insertPoint.parentNode?.insertBefore(statsCard, insertPoint.nextSibling);

    // Create and insert game details
    const detailsContainer = document.getElementById('guest-game-details');
    if (detailsContainer) {
      const details = createGameTypeDetails();
      detailsContainer.appendChild(details);
    }

    // Update i18n for newly added elements
    if (window.i18next && window.i18next.addResourceBundle) {
      // Try to update translated text
      setTimeout(() => {
        if (typeof window.updatePageLanguage === 'function') {
          window.updatePageLanguage();
        }
      }, 100);
    }
  }

  /**
   * Export all guest game data for user
   * Returns a downloadable JSON file
   */
  function downloadGuestData() {
    const data = window.GuestGameStorage?.exportData();
    if (!data) {
      alert(window.i18next ? window.i18next.t('noDataToExport') : '没有数据可导出');
      return;
    }

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guest-game-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[GuestGameDisplay] Guest data downloaded');
  }

  /**
   * Clear all guest game data and show confirmation
   */
  function clearGuestData() {
    if (confirm(window.i18next ? window.i18next.t('clearGuestDataConfirm') : '确定要清除所有游客游戏数据吗？')) {
      window.GuestGameStorage?.clearAllData();
      alert(window.i18next ? window.i18next.t('guestDataCleared') : '游客数据已清除');
      
      // Reload the page to update display
      location.reload();
    }
  }

  // Export to global scope
  window.GuestGameDisplay = {
    formatPlayTime,
    createGuestStatsCard,
    createGameTypeDetails,
    insertGuestStatsInSettings,
    downloadGuestData,
    clearGuestData
  };

  console.log('[GuestGameDisplay] Initialized - UI utilities for guest game statistics');
})();
