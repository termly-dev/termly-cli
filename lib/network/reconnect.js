const logger = require('../utils/logger');

class ReconnectionManager {
  constructor(maxAttempts = 10) {
    this.maxAttempts = maxAttempts;
    this.currentAttempt = 0;
    this.reconnectTimeout = null;
  }

  // Calculate backoff delay (exponential)
  getBackoffDelay() {
    if (this.currentAttempt === 0) return 0; // Immediate first reconnect
    if (this.currentAttempt === 1) return 2000; // 2 seconds
    if (this.currentAttempt === 2) return 4000; // 4 seconds
    if (this.currentAttempt === 3) return 8000; // 8 seconds
    return 16000; // 16 seconds for all subsequent attempts
  }

  // Attempt reconnection
  async attemptReconnect(reconnectFn) {
    this.currentAttempt++;

    if (this.currentAttempt > this.maxAttempts) {
      logger.error(`Max reconnection attempts (${this.maxAttempts}) reached`);
      return false;
    }

    const delay = this.getBackoffDelay();

    if (delay > 0) {
      logger.warn(`Reconnecting in ${delay / 1000} seconds... (attempt ${this.currentAttempt}/${this.maxAttempts})`);
      await this.sleep(delay);
    } else {
      logger.warn(`Reconnecting... (attempt ${this.currentAttempt}/${this.maxAttempts})`);
    }

    try {
      await reconnectFn();
      this.reset();
      return true;
    } catch (err) {
      logger.debug(`Reconnection attempt ${this.currentAttempt} failed: ${err.message}`);
      return false;
    }
  }

  // Schedule reconnection
  scheduleReconnect(reconnectFn) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.getBackoffDelay();

    this.reconnectTimeout = setTimeout(async () => {
      await this.attemptReconnect(reconnectFn);
    }, delay);
  }

  // Reset reconnection state
  reset() {
    this.currentAttempt = 0;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Cancel reconnection
  cancel() {
    this.reset();
  }

  // Sleep helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Check if should continue reconnecting
  shouldReconnect() {
    return this.currentAttempt < this.maxAttempts;
  }

  // Get current attempt number
  getCurrentAttempt() {
    return this.currentAttempt;
  }
}

module.exports = ReconnectionManager;
