/**
 * Application constants
 *
 * All magic numbers and configuration values should be defined here.
 */

module.exports = {
  // Network & WebSocket
  HEARTBEAT_TIMEOUT: 13000,        // 13s - detect network loss (server pings every ~5s)
  CLI_IDLE_THRESHOLD: 15000,       // 15s - no PTY output = CLI is idle

  // PTY & Terminal
  RESTORE_RESIZE_DELAY: 2000,      // 2s - delay before restoring terminal size after mobile disconnect

  // Buffer
  DEFAULT_BUFFER_SIZE: 100000,     // 100KB - circular buffer max size

  // Reconnection
  MAX_RECONNECT_ATTEMPTS: 10,      // Max WebSocket reconnection attempts
};
