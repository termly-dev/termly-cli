const logger = require('../utils/logger');

class ReconnectionManager {
  constructor(maxAttempts = 10) {
    this.maxAttempts = maxAttempts;
    this.currentAttempt = 0;
    this.reconnectTimeout = null;
    // Spinner frames (like npm install)
    this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.spinnerIndex = 0;
    this.spinnerInterval = null;
    this.currentMessage = '';
  }

  // Calculate backoff delay (exponential)
  getBackoffDelay() {
    if (this.currentAttempt === 0) return 0; // Immediate first reconnect
    if (this.currentAttempt === 1) return 2000; // 2 seconds
    if (this.currentAttempt === 2) return 4000; // 4 seconds
    return 8000; // 8 seconds for all subsequent attempts
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
      const message = `Reconnecting in ${delay / 1000} seconds... (attempt ${this.currentAttempt}/${this.maxAttempts})`;
      this.updateSpinnerMessage(message);
      await this.sleep(delay);
    } else {
      const message = `Reconnecting... (attempt ${this.currentAttempt}/${this.maxAttempts})`;
      this.updateSpinnerMessage(message);
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

  // Start continuous spinner animation
  startSpinner(message) {
    this.currentMessage = message;
    this.spinnerIndex = 0;

    // Clear any existing interval
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
    }

    const chalk = require('chalk');

    // Update spinner every 80ms (like npm)
    this.spinnerInterval = setInterval(() => {
      const spinner = this.spinnerFrames[this.spinnerIndex % this.spinnerFrames.length];
      this.spinnerIndex++;
      const uiMessage = `${spinner}  ${this.currentMessage}`;
      process.stderr.write('\x1b[2K\r' + chalk.yellow(uiMessage));
    }, 80);
  }

  // Update spinner message without restarting animation
  updateSpinnerMessage(message) {
    this.currentMessage = message;
  }

  // Stop spinner animation
  stopSpinner() {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
  }
}

module.exports = ReconnectionManager;
