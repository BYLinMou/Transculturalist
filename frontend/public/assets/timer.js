/**
 * Unified game timer module
 * Provides the following features:
 * - Game start/pause/stop timing
 * - Regularly update game time to database (without interrupting the game)
 * - Save final time when game ends
 * - Support real-time viewing of play time on settings page
 */

class GameTimer {
  constructor(options = {}) {
    this.startTime = 0;
    this.elapsedSeconds = 0;
    this.timerInterval = null;
    this.syncInterval = null;
    
    // Configuration options
    this.displayElement = options.displayElement || null;
    this.gameName = options.gameName || null;
    this.theme = options.theme || null;
    // Use GameConfig if available, otherwise fallback to provided value or 10
    const defaultSyncInterval = (typeof window !== 'undefined' && window.GameConfig) 
      ? window.GameConfig.get('TIMER.AUTO_SYNC_INTERVAL', 10)
      : 10;
    this.syncIntervalSeconds = options.syncIntervalSeconds || defaultSyncInterval;
    this.onSyncCallback = options.onSyncCallback || null; // Callback during sync (for custom logic)
    this.isRunning = false;
  }

  /**
   * Start the timer
   */
  start() {
    if (this.isRunning) return;
    
    this.startTime = Date.now() - (this.elapsedSeconds * 1000);
    this.isRunning = true;
    
    // Start display update (update every second)
    this.timerInterval = setInterval(() => {
      this.updateDisplay();
    }, 1000);
    
    // Start periodic sync to database (every syncIntervalSeconds seconds)
    this.syncInterval = setInterval(() => {
      this.syncToDatabase();
    }, this.syncIntervalSeconds * 1000);
    
    console.log(`[GameTimer] Started for ${this.gameName} on theme ${this.theme}`);
  }

  /**
   * Pause the timer
   */
  pause() {
    if (!this.isRunning) return;
    
    clearInterval(this.timerInterval);
    clearInterval(this.syncInterval);
    this.isRunning = false;
    
    console.log(`[GameTimer] Paused at ${this.getFormattedTime()}`);
  }

  /**
   * Stop the timer and return the final time
   * @returns {number} Total seconds
   */
  stop() {
    this.pause();
    const finalSeconds = this.getElapsedSeconds();
    console.log(`[GameTimer] Stopped after ${this.getFormattedTime()} (${finalSeconds}s)`);
    return finalSeconds;
  }

  /**
   * Reset the timer
   */
  reset() {
    this.stop();
    this.elapsedSeconds = 0;
    this.startTime = 0;
    this.updateDisplay();
    console.log(`[GameTimer] Reset`);
  }

  /**
   * Get the current elapsed seconds
   * @returns {number}
   */
  getElapsedSeconds() {
    if (this.isRunning) {
      this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    }
    return this.elapsedSeconds;
  }

  /**
   * Get the formatted time string (MM:SS)
   * @returns {string}
   */
  getFormattedTime() {
    const seconds = this.getElapsedSeconds();
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  /**
   * Update the time in the display element
   */
  updateDisplay() {
    if (!this.displayElement) return;
    
    const seconds = this.getElapsedSeconds();
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    this.displayElement.textContent = `${minutes}:${secs}`;
  }

  /**
   * Regularly sync play time to database (background seamless sync)
   */
  async syncToDatabase() {
    if (!this.gameName || !this.theme) {
      console.warn('[GameTimer] Missing gameName or theme, cannot sync');
      return;
    }

    try {
      const elapsedSeconds = this.getElapsedSeconds();
      
      // If custom callback is defined, use callback
      if (this.onSyncCallback && typeof this.onSyncCallback === 'function') {
        await this.onSyncCallback(elapsedSeconds);
        return;
      }

      // Default use API Helper to sync to server
      const response = await window.apiHelper.request('/api/statistics/playtime', {
        method: 'POST',
        body: JSON.stringify({
          gameId: this.gameName,
          theme: this.theme,
          playTimeSeconds: elapsedSeconds,
          syncOnly: true // Mark as sync, does not affect game flow
        })
      });

      if (!response.ok) {
        console.warn(`[GameTimer] Failed to sync playtime: ${response.status}`);
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`[GameTimer] Synced ${elapsedSeconds}s to database for ${this.gameName}`);
      } else {
        console.warn('[GameTimer] Sync response indicated failure:', result.error || result);
      }
    } catch (error) {
      // Silent failure, does not affect game progress
      console.warn('[GameTimer] Sync error (non-critical):', error.message);
    }
  }

  /**
   * Save operation when game ends
   * Save final game time and related statistics
   * @param {object} additionalData Additional data to save (such as score, accuracy, etc.)
   */
  async finishGame(additionalData = {}) {
    const finalSeconds = this.stop();
    
    if (!this.gameName || !this.theme) {
      console.warn('[GameTimer] Missing gameName or theme, cannot save game result');
      return null;
    }

    try {
      const gameResultData = {
        gameId: this.gameName,
        theme: this.theme,
        playTimeSeconds: finalSeconds,
        ...additionalData
      };

      const response = await window.apiHelper.request('/api/statistics/game-result', {
        method: 'POST',
        body: JSON.stringify(gameResultData)
      });

      if (!response.ok) {
        console.error(`[GameTimer] Failed to save game result: ${response.status}`);
        return null;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`[GameTimer] Game result saved: ${this.gameName} (${finalSeconds}s)`);
        return result.data;
      } else {
        console.error('[GameTimer] Save game result response indicated failure', result);
        return null;
      }
    } catch (error) {
      console.error('[GameTimer] Error saving game result:', error);
      return null;
    }
  }

  /**
   * Destroy the timer, clean up resources
   */
  destroy() {
    this.stop();
    this.startTime = 0;
    this.elapsedSeconds = 0;
    console.log(`[GameTimer] Destroyed`);
  }
}

// Export to global object, convenient for use in HTML
window.GameTimer = GameTimer;
