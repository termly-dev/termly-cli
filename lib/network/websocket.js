const WebSocket = require('ws');
const chalk = require('chalk');
const { encrypt, decrypt } = require('../crypto/aes');
const logger = require('../utils/logger');
const ReconnectionManager = require('./reconnect');
const { CLI_IDLE_THRESHOLD, HEARTBEAT_TIMEOUT, RESTORE_RESIZE_DELAY } = require('../config/constants');

class WebSocketManager {
  constructor(serverUrl, sessionId, buffer) {
    this.serverUrl = serverUrl;
    this.sessionId = sessionId;
    this.buffer = buffer;
    this.ws = null;
    this.aesKey = null;
    this.mobileConnected = false;
    this.reconnectionManager = new ReconnectionManager(10);
    this.shouldReconnect = true;
    this.restoreResizeTimer = null;
    this.pairingCode = null; // Store pairing code for reconnection
    this.isReconnecting = false; // Prevent multiple simultaneous reconnection attempts
    this.ptyManager = null; // PTY Manager reference for pausing output during reconnection

    // Heartbeat monitoring (detect network loss)
    this.heartbeatTimer = null; // Timer to detect network loss
    this.lastMessageTime = Date.now(); // Track last message from server

    // CLI status tracking for push notifications
    this.lastOutputTime = Date.now(); // Track last PTY output time
    this.cliStatus = 'idle'; // 'idle' or 'busy'

    // Callbacks
    this.onMobileConnectedCallback = null;
    this.onMobileDisconnectedCallback = null;
    this.onInputCallback = null;
    this.onResizeCallback = null;
    this.onPairedCallback = null;
    this.onRestoreResizeCallback = null;
  }

  // Connect to WebSocket server
  async connect(pairingCode) {
    // Store pairing code for reconnection
    this.pairingCode = pairingCode;

    return new Promise((resolve, reject) => {
      const url = `${this.serverUrl}/ws/agent?code=${pairingCode}`;

      logger.debug(`Connecting to WebSocket: ${url}`);

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        logger.success('Connected to server');
        this.reconnectionManager.reset();
        this.startHeartbeatMonitoring();
        resolve();
      });

      this.ws.on('message', (rawData) => {
        this.handleMessage(rawData);
      });

      this.ws.on('close', (code, reason) => {
        this.handleClose(code, reason);
      });

      this.ws.on('error', (err) => {
        logger.error(`WebSocket error: ${err.message}`);
        reject(err);
      });
    });
  }

  // Handle incoming WebSocket message
  handleMessage(rawData) {
    // Update last message time (any message means connection is alive)
    this.resetHeartbeatTimer();

    try {
      const message = JSON.parse(rawData.toString());
      logger.debug(`WS message: ${message.type}`);

      switch (message.type) {
        case 'pairing_complete':
          this.handlePairingComplete(message);
          break;

        case 'client_connected':
          this.handleClientConnected();
          break;

        case 'client_disconnected':
          this.handleClientDisconnected();
          break;

        case 'catchup_request':
          logger.debug(`Received catchup_request from backend: ${JSON.stringify(message)}`);
          this.handleCatchupRequest(message);
          break;

        case 'input':
          this.handleInput(message);
          break;

        case 'resize':
          this.handleResize(message);
          break;

        case 'ping':
          this.handlePing();
          break;

        default:
          logger.debug(`Unknown message type: ${message.type}`);
      }
    } catch (err) {
      logger.error(`Failed to parse message: ${err.message}`);
    }
  }

  // Handle pairing complete
  handlePairingComplete(message) {
    logger.success('Pairing complete!');

    // Update sessionId from backend
    if (message.sessionId) {
      this.sessionId = message.sessionId;
      logger.debug(`Session ID updated from backend: ${this.sessionId}`);
    }

    if (this.onPairedCallback) {
      this.onPairedCallback(message.publicKey, message.sessionId);
    }
  }

  // Handle client connected
  handleClientConnected() {
    // Only show on console in debug mode, but always log to file
    logger.debugInfo('Mobile device connected');
    if (process.env.DEBUG === '1' || process.argv.includes('--debug')) {
      console.log(chalk.green('\n📱 Mobile device connected'));
    }
    this.mobileConnected = true;

    // Cancel restore resize timer if mobile reconnected
    this.cancelRestoreResizeTimer();

    // Clear local screen before resize to prevent artifacts (TUI apps only)
    if (this.ptyManager && this.ptyManager.isTUI()) {
      process.stdout.write('\x1b[2J\x1b[H');
    }

    if (this.onMobileConnectedCallback) {
      this.onMobileConnectedCallback();
    }
  }

  // Handle client disconnected
  handleClientDisconnected() {
    // Only show on console in debug mode, but always log to file
    logger.debugInfo('Mobile device disconnected');
    if (process.env.DEBUG === '1' || process.argv.includes('--debug')) {
      console.log(chalk.yellow('\n📱 Mobile device disconnected'));
    }
    this.mobileConnected = false;

    // Start timer to restore terminal size after delay
    this.startRestoreResizeTimer();

    if (this.onMobileDisconnectedCallback) {
      this.onMobileDisconnectedCallback();
    }
  }

  // Handle catchup request (production pattern: send messages one-by-one with delays)
  async handleCatchupRequest(message) {
    logger.debug(`Catchup requested from seq ${message.lastSeq}`);

    this.mobileConnected = true;

    // Cancel restore resize timer if mobile reconnected
    this.cancelRestoreResizeTimer();

    // Clear local screen before resize to prevent artifacts (TUI apps only)
    if (this.ptyManager && this.ptyManager.isTUI()) {
      process.stdout.write('\x1b[2J\x1b[H');
    }

    // Get buffer stats for debugging
    const bufferStats = this.buffer.getStats();
    logger.debug(`Buffer stats: ${JSON.stringify(bufferStats)}`);

    // Get missed messages
    const missedMessages = this.buffer.getAfter(message.lastSeq);

    logger.debug(`Sending ${missedMessages.length} missed messages as batches`);

    // Show detailed info about missed messages in debug mode
    if (process.env.DEBUG === '1' || process.argv.includes('--debug')) {
      if (missedMessages.length > 0) {
        logger.debug(`Missed messages seq range: ${missedMessages[0].seq} to ${missedMessages[missedMessages.length - 1].seq}`);

        // Check for duplicate sequence numbers
        const seqCounts = {};
        missedMessages.forEach(msg => {
          seqCounts[msg.seq] = (seqCounts[msg.seq] || 0) + 1;
        });
        const duplicateSeqs = Object.entries(seqCounts).filter(([seq, count]) => count > 1);
        if (duplicateSeqs.length > 0) {
          logger.debug(`⚠️  WARNING: Found duplicate seq numbers in buffer: ${JSON.stringify(duplicateSeqs)}`);
        }

        // Show first 3 and last 3 message previews
        const preview = missedMessages.slice(0, 3).concat(
          missedMessages.length > 6 ? ['...'] : [],
          missedMessages.slice(-3)
        );
        preview.forEach(msg => {
          if (msg === '...') {
            logger.debug(`  ... (${missedMessages.length - 6} more messages)`);
          } else {
            const dataPreview = msg.data.substring(0, 50).replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\x1b/g, '\\x1b');
            logger.debug(`  seq ${msg.seq}: ${msg.size} bytes, "${dataPreview}..."`);
          }
        });
      }
    }

    // NEW: Send messages in batches to preserve order
    const BATCH_SIZE = 100;
    const batches = [];

    for (let i = 0; i < missedMessages.length; i += BATCH_SIZE) {
      batches.push(missedMessages.slice(i, i + BATCH_SIZE));
    }

    logger.debug(`Split into ${batches.length} batches of ${BATCH_SIZE}`);

    // Send each batch as a single message
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      logger.debug(`Sending batch ${batchIndex + 1}/${batches.length} with ${batch.length} messages (seq ${batch[0].seq} to ${batch[batch.length - 1].seq})`);

      // Send batch message with array of messages
      this.send({
        type: 'catchup_batch',
        batch: batch.map(msg => {
          if (this.aesKey) {
            // Re-encrypt with new IV for each message
            try {
              const encrypted = encrypt(msg.data, this.aesKey);
              return {
                seq: msg.seq,
                data: encrypted.ciphertext,
                encrypted: true,
                iv: encrypted.iv,
                timestamp: msg.timestamp
              };
            } catch (err) {
              logger.error(`Failed to encrypt batch message seq=${msg.seq}: ${err.message}`);
              return {
                seq: msg.seq,
                data: msg.data,
                encrypted: false,
                iv: undefined,
                timestamp: msg.timestamp
              };
            }
          } else {
            return {
              seq: msg.seq,
              data: msg.data,
              encrypted: false,
              iv: undefined,
              timestamp: msg.timestamp
            };
          }
        }),
        batchIndex: batchIndex,
        totalBatches: batches.length
      });

      // Small delay between batches (only if not last batch)
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Send sync complete after all catchup messages
    logger.debug('Sending sync_complete');
    this.send({
      type: 'sync_complete',
      currentSeq: this.buffer.getCurrentSeq()
    });

    logger.debug('Catchup complete');

    if (this.onMobileConnectedCallback) {
      this.onMobileConnectedCallback();
    }
  }

  // Handle input from mobile
  handleInput(message) {
    if (!this.aesKey) {
      logger.warn('Received input but no encryption key set');
      return;
    }

    try {
      const decrypted = decrypt(message.data, message.iv, this.aesKey);

      if (this.onInputCallback) {
        this.onInputCallback(decrypted);
      }
    } catch (err) {
      logger.error(`Failed to decrypt input: ${err.message}`);
    }
  }

  // Handle resize request from mobile
  handleResize(message) {
    if (this.onResizeCallback) {
      this.onResizeCallback(message.cols, message.rows);
    }
  }

  // Handle ping from server (respond with pong)
  handlePing() {
    // Show ping in console only in debug mode
    if (process.env.DEBUG) {
      console.log(chalk.gray(`[${new Date().toLocaleTimeString()}] ← ping from server`));
    }

    // Determine CLI status based on time since last output
    const timeSinceOutput = Date.now() - this.lastOutputTime;
    this.cliStatus = timeSinceOutput > CLI_IDLE_THRESHOLD ? 'idle' : 'busy';

    logger.debug(`Received ping, sending pong with status: ${this.cliStatus}`);
    this.send({
      type: 'pong',
      timestamp: new Date().toISOString(),
      status: this.cliStatus
    });
  }

  // Handle WebSocket close
  handleClose(_code, reason) {

    this.stopHeartbeatMonitoring();

    // Parse error message from backend
    let errorData = null;
    try {
      if (reason && reason.toString().trim().startsWith('{')) {
        errorData = JSON.parse(reason.toString());
      }
    } catch (err) {
      // Not JSON, ignore
    }

    // Check if session expired or not found
    if (errorData && (errorData.error === 'session_expired' || errorData.error === 'session_not_found')) {
      console.log(chalk.yellow(`\n⚠️  ${errorData.message || 'Session no longer valid'}`));
      console.log(chalk.yellow('Please restart the CLI session:'));
      console.log(chalk.cyan('  termly start'));
      logger.error(`Session invalid: ${errorData.error}`);
      process.exit(1);
    }

    // Prevent multiple simultaneous reconnection attempts
    if (this.isReconnecting) {
      return;
    }
    logger.warn('WebSocket closed: Input paused until reconnection');
    if (this.shouldReconnect && this.reconnectionManager.shouldReconnect()) {
      this.reconnect();
    } else {
      logger.info('Not reconnecting');
    }
  }

  // Reconnect to WebSocket
  async reconnect() {
    this.isReconnecting = true;

    // Pause PTY output during reconnection to prevent UI interference
    if (this.ptyManager) {
      this.ptyManager.pauseOutput();
    }

    // Start continuous spinner animation
    this.reconnectionManager.startSpinner('Connection lost. Reconnecting...');

    // Try multiple reconnection attempts
    let success = false;
    while (!success && this.reconnectionManager.shouldReconnect()) {
      success = await this.reconnectionManager.attemptReconnect(async () => {
        // Reconnect using sessionId (not pairing code)
        if (!this.sessionId) {
          throw new Error('No session ID available for reconnection');
        }

        const url = `${this.serverUrl}/ws/agent?sessionId=${this.sessionId}`;
        logger.debug(`Reconnecting to WebSocket: ${url}`);

        return new Promise((resolve, reject) => {
          // Close old WebSocket and remove its listeners to prevent duplicate reconnection attempts
          if (this.ws) {
            // Remove all event listeners to prevent handleClose() from being called
            this.ws.removeAllListeners();

            // Close the old WebSocket
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
              this.ws.close();
            }
          }

          this.ws = new WebSocket(url);

          // Attach event handlers BEFORE connection opens
          this.ws.on('message', (rawData) => {
            this.handleMessage(rawData);
          });

          this.ws.on('close', (code, reason) => {
            this.handleClose(code, reason);
          });

          this.ws.on('error', (err) => {
            reject(err);
          });

          this.ws.on('open', () => {
            this.startHeartbeatMonitoring();
            resolve();
          });
        });
      });
    }

    // Stop spinner animation
    this.reconnectionManager.stopSpinner();

    this.isReconnecting = false;

    // Resume PTY output after reconnection attempt
    if (this.ptyManager) {
      this.ptyManager.resumeOutput();
    }

    if (success) {
      // Show success message
      const msg = '✅ Reconnected to server!';
      process.stderr.write('\x1b[2K\r' + chalk.green(msg) + '\n');
    } else {
      // Show warning but keep session alive
      const msg = '⚠️  Failed to reconnect. Session continues locally.';
      process.stderr.write('\x1b[2K\r' + chalk.yellow(msg) + '\n');
      logger.warn('Reconnection failed, but PTY session continues running');
    }
  }

  // Set encryption key
  setEncryptionKey(aesKey) {
    this.aesKey = aesKey;
    logger.debug('Encryption key set');
  }

  // Send output to mobile (encrypted)
  sendOutput(data, seq = null, timestamp = null) {
    // Update last output time for CLI status tracking (even if not sending to mobile)
    this.lastOutputTime = Date.now();
    this.cliStatus = 'busy';

    if (!this.mobileConnected || !this.aesKey) {
      return;
    }

    try {
      const encrypted = encrypt(data, this.aesKey);

      this.send({
        type: 'output',
        sessionId: this.sessionId,
        seq: seq !== null ? seq : this.buffer.getCurrentSeq(),
        encrypted: true,
        data: encrypted.ciphertext,
        iv: encrypted.iv,
        timestamp: timestamp || new Date().toISOString()
      });
    } catch (err) {
      logger.error(`Failed to encrypt output: ${err.message}`);
    }
  }

  // Send message to server
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.warn('Cannot send message: WebSocket not open');
    }
  }

  // Set callbacks
  onPaired(callback) {
    this.onPairedCallback = callback;
  }

  onMobileConnected(callback) {
    this.onMobileConnectedCallback = callback;
  }

  onMobileDisconnected(callback) {
    this.onMobileDisconnectedCallback = callback;
  }

  onInput(callback) {
    this.onInputCallback = callback;
  }

  onResize(callback) {
    this.onResizeCallback = callback;
  }

  onRestoreResize(callback) {
    this.onRestoreResizeCallback = callback;
  }

  // Set PTY Manager reference (for pausing output during reconnection)
  setPTYManager(ptyManager) {
    this.ptyManager = ptyManager;
  }

  // Start timer to restore terminal size after mobile disconnect
  startRestoreResizeTimer() {
    // Clear any existing timer
    this.cancelRestoreResizeTimer();

    logger.debug(`Starting restore resize timer (${RESTORE_RESIZE_DELAY}ms)`);

    this.restoreResizeTimer = setTimeout(() => {
      logger.debug('Restore resize timer expired, restoring terminal size');

      if (this.onRestoreResizeCallback) {
        this.onRestoreResizeCallback();
      }

      this.restoreResizeTimer = null;
    }, RESTORE_RESIZE_DELAY);
  }

  // Cancel restore resize timer
  cancelRestoreResizeTimer() {
    if (this.restoreResizeTimer) {
      logger.debug('Cancelling restore resize timer (mobile reconnected)');
      clearTimeout(this.restoreResizeTimer);
      this.restoreResizeTimer = null;
    }
  }

  // Start heartbeat monitoring
  startHeartbeatMonitoring() {
    logger.debug('Starting heartbeat monitoring...');
    // On new connection, use a more lenient timeout for the first check
    this.resetHeartbeatTimer(true);
  }

  // Stop heartbeat monitoring
  stopHeartbeatMonitoring() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Reset heartbeat timer (called on every message from server)
  resetHeartbeatTimer(isInitial = false) {
    this.lastMessageTime = Date.now();

    // Clear existing timer
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
    }

    // Use a longer timeout for the initial check after a connection is established
    const timeout = isInitial ? HEARTBEAT_TIMEOUT * 2 : HEARTBEAT_TIMEOUT;
    const timeoutSeconds = (timeout / 1000).toFixed(1);

    if (isInitial) {
      logger.debug(`Lenient heartbeat check scheduled in ${timeoutSeconds}s`);
    }

    // Set new timer
    this.heartbeatTimer = setTimeout(() => {
      const elapsed = Date.now() - this.lastMessageTime;
      logger.warn(`No response from server for ${(elapsed / 1000).toFixed(1)}s - forcing reconnection`);

      // Force close WebSocket to trigger reconnection
      if (this.ws) {
        logger.debug('Forcing WebSocket close due to heartbeat timeout');
        this.ws.terminate(); // Force close without waiting for server
      }
    }, timeout);
  }

  // Close WebSocket
  close() {
    this.shouldReconnect = false;
    this.reconnectionManager.cancel();
    this.stopHeartbeatMonitoring();

    // Cancel restore resize timer
    this.cancelRestoreResizeTimer();

    if (this.ws) {
      this.ws.close(1000, 'Client closed');
      this.ws = null;
    }
  }

  // Check if connected
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

module.exports = WebSocketManager;
