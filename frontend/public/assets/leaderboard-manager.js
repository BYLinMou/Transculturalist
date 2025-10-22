/**
 * Leaderboard Manager
 * Handles leaderboard data fetching and display
 */

class LeaderboardManager {
  constructor() {
    this.leaderboardData = {
      'game-duration': [],
      'average-score': [],
      'forum-contribution': []
    };
    this.userRankContext = null;
    this.refreshInterval = 60000; // 1 minute
    this.refreshTimers = {};
  }

  /**
   * Format time from seconds to readable string
   */
  formatTime(seconds) {
    if (!seconds || seconds === 0) return '0 ' + this.getTranslatedUnit('minutes');
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours} ${this.getTranslatedUnit('hours')} ${minutes % 60} ${this.getTranslatedUnit('minutes')}`;
    }
    return `${minutes} ${this.getTranslatedUnit('minutes')}`;
  }

  /**
   * Get translated unit from i18n
   */
  getTranslatedUnit(unit) {
    if (window.i18next) {
      return window.i18next.t(unit) || unit;
    }
    
    return unit;
  }

  /**
   * Get translated game unit
   */
  getGameUnit() {
    if (window.i18next) {
      return window.i18next.t('games') || '局';
    }
    return '局';
  }

  /**
   * Get no ranking data text
   */
  getNoRankingDataText() {
    if (window.i18next) {
      return window.i18next.t('noRankingData') || '暫無排行資料';
    }
    return '暫無排行資料';
  }

  /**
   * Get player fallback text
   */
  getPlayerFallbackText() {
    if (window.i18next) {
      return window.i18next.t('player') || '玩家';
    }
    return '玩家';
  }

  /**
   * Get placeholder position text (for vacant positions)
   */
  getPlaceholderText() {
    if (window.i18next) {
      return window.i18next.t('placeholderPosition') || '虛位以待';
    }
    return '虛位以待';
  }

  /**
   * Fetch leaderboard data from API
   */
  async fetchLeaderboard(type = 'game-duration', limit = 50) {
    try {
      // Use fetch directly to avoid language parameter issues with leaderboard API
      const response = await fetch(`/api/game/leaderboard?type=${type}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiHelper.getAuthToken() ? `Bearer ${apiHelper.getAuthToken()}` : ''
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        this.leaderboardData[type] = data.data.leaderboard || [];
        this.userRankContext = data.data.userRankContext || null;
        console.log(`[Leaderboard] Fetched ${type} leaderboard with ${this.leaderboardData[type].length} entries`);
        return this.leaderboardData[type];
      } else {
        console.error('[Leaderboard] API error:', data.error);
        return [];
      }
    } catch (error) {
      console.error('[Leaderboard] Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Render game duration leaderboard table
   */
  renderGameDurationTable() {
    // Try both ranking.html and forum.html table IDs
    const tbody = document.getElementById('gameDurationTableBody') || document.getElementById('forumGameDurationTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const maxRows = 8;
    const currentData = this.leaderboardData['game-duration'].slice(0, maxRows);
    
    // If no data, show placeholder
    if (currentData.length === 0) {
      tbody.innerHTML = `
        <tr class="border-b border-gray-700 hover:bg-gray-800 transition-colors">
          <td colspan="5" class="px-4 py-8 text-center text-gray-400">
            ${this.getNoRankingDataText()}
          </td>
        </tr>
      `;
      return;
    }

    // Render actual data rows
    currentData.forEach((row) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-700 hover:bg-gray-800 transition-colors';

      // Rank badge styling
      let rankBadgeClass = 'bg-gray-600 text-white';
      if (row.rank === 1) rankBadgeClass = 'bg-gold-600 text-black';
      else if (row.rank === 2) rankBadgeClass = 'bg-gray-400 text-black';
      else if (row.rank === 3) rankBadgeClass = 'bg-orange-600 text-black';

      tr.innerHTML = `
        <td class="px-4 py-3">
          <span class="inline-block w-6 h-6 ${rankBadgeClass} font-bold text-center rounded-full text-caption">${row.rank}</span>
        </td>
        <td class="px-4 py-3">${escapeHtml(row.username || this.getPlayerFallbackText())}</td>
        <td class="px-4 py-3 text-center">${row.totalPlayTimeMinutes} ${this.getTranslatedUnit('minutes')}</td>
        <td class="px-4 py-3 text-center">${row.completedGames}</td>
        <td class="px-4 py-3 text-center font-bold text-gold-300">${parseFloat(row.score).toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });

    // Add placeholder rows for vacant positions
    for (let i = currentData.length; i < maxRows; i++) {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-700 hover:bg-gray-800 transition-colors opacity-50';

      tr.innerHTML = `
        <td class="px-4 py-3">
          <span class="inline-block w-6 h-6 bg-gray-500 text-white font-bold text-center rounded-full text-caption">${i + 1}</span>
        </td>
        <td class="px-4 py-3 text-gray-500" data-i18n="placeholderPosition">${this.getPlaceholderText()}</td>
        <td class="px-4 py-3 text-center text-gray-500">--</td>
        <td class="px-4 py-3 text-center text-gray-500">--</td>
        <td class="px-4 py-3 text-center font-bold text-gray-500">--</td>
      `;
      tbody.appendChild(tr);
    }
  }

  /**
   * Render average score leaderboard table
   */
  renderAverageScoreTable() {
    // Try both ranking.html and forum.html table IDs
    const tbody = document.getElementById('averageScoreTableBody') || document.getElementById('forumAverageScoreTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const maxRows = 8;
    const currentData = this.leaderboardData['average-score'].slice(0, maxRows);

    if (currentData.length === 0) {
      tbody.innerHTML = `
        <tr class="border-b border-gray-700 hover:bg-gray-800 transition-colors">
          <td colspan="5" class="px-4 py-8 text-center text-gray-400">
            ${this.getNoRankingDataText()}
          </td>
        </tr>
      `;
      return;
    }

    // Render actual data rows
    currentData.forEach((row) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-700 hover:bg-gray-800 transition-colors';

      // Rank badge styling
      let rankBadgeClass = 'bg-gray-600 text-white';
      if (row.rank === 1) rankBadgeClass = 'bg-gold-600 text-black';
      else if (row.rank === 2) rankBadgeClass = 'bg-gray-400 text-black';
      else if (row.rank === 3) rankBadgeClass = 'bg-orange-600 text-black';

      tr.innerHTML = `
        <td class="px-4 py-3">
          <span class="inline-block w-6 h-6 ${rankBadgeClass} font-bold text-center rounded-full text-caption">${row.rank}</span>
        </td>
        <td class="px-4 py-3">${escapeHtml(row.username || this.getPlayerFallbackText())}</td>
        <td class="px-4 py-3 text-center">${row.completedGames}</td>
        <td class="px-4 py-3 text-center">${(row.completedGames * row.averageScore).toFixed(2)}</td>
        <td class="px-4 py-3 text-center font-bold text-gold-300">${row.averageScore}</td>
      `;
      tbody.appendChild(tr);
    });

    // Add placeholder rows for vacant positions
    for (let i = currentData.length; i < maxRows; i++) {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-700 hover:bg-gray-800 transition-colors opacity-50';

      tr.innerHTML = `
        <td class="px-4 py-3">
          <span class="inline-block w-6 h-6 bg-gray-500 text-white font-bold text-center rounded-full text-caption">${i + 1}</span>
        </td>
        <td class="px-4 py-3 text-gray-500" data-i18n="placeholderPosition">${this.getPlaceholderText()}</td>
        <td class="px-4 py-3 text-center text-gray-500">--</td>
        <td class="px-4 py-3 text-center text-gray-500">--</td>
        <td class="px-4 py-3 text-center font-bold text-gray-500">--</td>
      `;
      tbody.appendChild(tr);
    }
  }

  /**
   * Setup auto-refresh for leaderboards
   */
  setupAutoRefresh(type = 'game-duration', interval = this.refreshInterval) {
    // Clear existing timer if any
    if (this.refreshTimers[type]) {
      clearInterval(this.refreshTimers[type]);
    }

    // Setup new auto-refresh timer
    this.refreshTimers[type] = setInterval(async () => {
      console.log(`[Leaderboard] Auto-refreshing ${type} leaderboard...`);
      await this.fetchLeaderboard(type);
      this.render(type);
    }, interval);

    console.log(`[Leaderboard] Auto-refresh setup for ${type} (interval: ${interval}ms)`);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh(type = 'game-duration') {
    if (this.refreshTimers[type]) {
      clearInterval(this.refreshTimers[type]);
      delete this.refreshTimers[type];
      console.log(`[Leaderboard] Auto-refresh stopped for ${type}`);
    }
  }

  /**
   * Render the appropriate table based on type
   */
  render(type = 'game-duration') {
    switch (type) {
      case 'average-score':
        this.renderAverageScoreTable();
        break;
      case 'game-duration':
      default:
        this.renderGameDurationTable();
    }
  }

  /**
   * Initialize leaderboard display
   */
  async initialize() {
    try {
      console.log('[Leaderboard] Initializing leaderboard...');
      
      // Fetch all leaderboard types
      await this.fetchLeaderboard('game-duration');
      await this.fetchLeaderboard('average-score');
      await this.fetchLeaderboard('forum-contribution');

      // Initial render
      this.render('game-duration');
      this.render('average-score');

      // Setup auto-refresh (1 minute)
      this.setupAutoRefresh('game-duration', this.refreshInterval);
      this.setupAutoRefresh('average-score', this.refreshInterval);
      this.setupAutoRefresh('forum-contribution', this.refreshInterval);

      // Listen for language changes and re-render tables
      window.addEventListener('i18n:languageChanged', () => {
        console.log('[Leaderboard] Language changed, re-rendering tables...');
        this.render('game-duration');
        this.render('average-score');
      });

      console.log('[Leaderboard] Initialization complete');
    } catch (error) {
      console.error('[Leaderboard] Initialization error:', error);
    }
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Create global leaderboard manager instance
const leaderboardManager = new LeaderboardManager();
