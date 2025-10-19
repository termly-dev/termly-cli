const { v4: uuidv4 } = require('uuid');
const os = require('os');

// Create new session state object
function createSession(projectName, workingDir, aiTool, aiToolDisplayName, aiToolVersion, serverUrl) {
  return {
    sessionId: uuidv4(),
    pid: process.pid,
    projectName,
    workingDir,
    aiTool,
    aiToolDisplayName,
    aiToolVersion: aiToolVersion || 'unknown',
    computerName: os.hostname(),
    serverUrl,
    startedAt: new Date().toISOString(),
    status: 'running',
    mobileConnected: false
  };
}

// Session state manager
class SessionState {
  constructor(session) {
    this.session = session;
    this.mobileConnected = false;
    this.wsConnected = false;
    this.pairingCode = null;
    this.aesKey = null;
    this.dh = null;
  }

  // Update mobile connection status
  setMobileConnected(connected) {
    this.mobileConnected = connected;
    this.session.mobileConnected = connected;
  }

  // Update WebSocket connection status
  setWSConnected(connected) {
    this.wsConnected = connected;
  }

  // Set pairing code
  setPairingCode(code) {
    this.pairingCode = code;
  }

  // Set encryption key
  setEncryptionKey(aesKey) {
    this.aesKey = aesKey;
  }

  // Set DH instance
  setDH(dh) {
    this.dh = dh;
  }

  // Get session info
  getSessionInfo() {
    return {
      ...this.session,
      mobileConnected: this.mobileConnected,
      wsConnected: this.wsConnected
    };
  }

  // Calculate uptime
  getUptime() {
    const start = new Date(this.session.startedAt);
    const now = new Date();
    const uptimeMs = now - start;

    const minutes = Math.floor(uptimeMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes} minutes`;
    }
  }
}

module.exports = {
  createSession,
  SessionState
};
