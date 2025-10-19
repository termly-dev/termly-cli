const WebSocket = require('ws');
const chalk = require('chalk');
const { encrypt, decrypt } = require('../crypto/aes');
const logger = require('../utils/logger');
const ReconnectionManager = require('./reconnect');

class WebSocketManager {
  constructor(serverUrl, sessionId, buffer) {
    this.serverUrl = serverUrl;
    this.sessionId = sessionId;
    this.buffer = buffer;
    this.ws = null;
    this.aesKey = null;
    this.mobileConnected = false;
    this.reconnectionManager = new ReconnectionManager(10);
    this.heartbeatInterval = null;
    this.shouldReconnect = true;

    // Callbacks
    this.onMobileConnectedCallback = null;
    this.onMobileDisconnectedCallback = null;
    this.onInputCallback = null;
    this.onResizeCallback = null;
    this.onPairedCallback = null;
  }

  // Connect to WebSocket server
  async connect(pairingCode) {
    return new Promise((resolve, reject) => {
      const url = `${this.serverUrl}/ws/agent?code=${pairingCode}`;

      logger.debug(`Connecting to WebSocket: ${url}`);

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        logger.success('Connected to server');
        this.reconnectionManager.reset();
        this.startHeartbeat();
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

        case 'client_reconnected':
          this.handleClientReconnected(message);
          break;

        case 'input':
          this.handleInput(message);
          break;

        case 'resize':
          this.handleResize(message);
          break;

        case 'pong':
          logger.debug('Heartbeat pong received');
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

    if (this.onPairedCallback) {
      this.onPairedCallback(message.theirPublicKey);
    }
  }

  // Handle client connected
  handleClientConnected() {
    console.log(chalk.green('\n📱 Mobile device connected'));
    this.mobileConnected = true;

    if (this.onMobileConnectedCallback) {
      this.onMobileConnectedCallback();
    }
  }

  // Handle client disconnected
  handleClientDisconnected() {
    console.log(chalk.yellow('\n📱 Mobile device disconnected'));
    this.mobileConnected = false;

    if (this.onMobileDisconnectedCallback) {
      this.onMobileDisconnectedCallback();
    }
  }

  // Handle client reconnected
  handleClientReconnected(message) {
    console.log(chalk.green(`\n📱 Mobile device reconnected. Sending catchup from seq ${message.lastSeq}`));

    this.mobileConnected = true;

    // Send missed messages
    const missedMessages = this.buffer.getAfter(message.lastSeq);

    logger.info(`Sending ${missedMessages.length} missed messages`);

    missedMessages.forEach(msg => {
      this.sendOutput(msg.data, msg.seq, msg.timestamp);
    });

    // Send sync complete
    this.send({
      type: 'sync_complete',
      currentSeq: this.buffer.getCurrentSeq()
    });

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

  // Handle WebSocket close
  handleClose(code, reason) {
    logger.warn(`WebSocket closed: ${code} ${reason}`);

    this.stopHeartbeat();

    if (this.shouldReconnect && this.reconnectionManager.shouldReconnect()) {
      this.reconnect();
    } else {
      logger.info('Not reconnecting');
    }
  }

  // Reconnect to WebSocket
  async reconnect() {
    logger.warn('⚠️  Connection lost. Reconnecting...');

    const success = await this.reconnectionManager.attemptReconnect(async () => {
      // We need pairing code to reconnect
      // In a real implementation, we'd store this
      throw new Error('Reconnection not fully implemented - need to store pairing code');
    });

    if (success) {
      logger.success('✅ Reconnected to server!');
    } else {
      logger.error('Failed to reconnect after max attempts');
      process.exit(1);
    }
  }

  // Set encryption key
  setEncryptionKey(aesKey) {
    this.aesKey = aesKey;
    logger.debug('Encryption key set');
  }

  // Send output to mobile (encrypted)
  sendOutput(data, seq = null, timestamp = null) {
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
        timestamp: timestamp || Date.now()
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

  // Start heartbeat
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          sessionId: this.sessionId
        });
      }
    }, 30000); // 30 seconds
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
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

  // Close WebSocket
  close() {
    this.shouldReconnect = false;
    this.reconnectionManager.cancel();
    this.stopHeartbeat();

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
