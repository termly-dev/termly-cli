const pty = require('node-pty');
const os = require('os');
const logger = require('../utils/logger');

class PTYManager {
  constructor(tool, workingDir, buffer) {
    this.tool = tool;
    this.workingDir = workingDir;
    this.buffer = buffer;
    this.ptyProcess = null;
    this.onDataCallback = null;
    this.onExitCallback = null;
  }

  // Start PTY process
  start(additionalArgs = []) {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const args = [...this.tool.args, ...additionalArgs];

    logger.info(`Starting ${this.tool.displayName}...`);
    logger.debug(`Command: ${this.tool.command} ${args.join(' ')}`);
    logger.debug(`Working directory: ${this.workingDir}`);

    try {
      this.ptyProcess = pty.spawn(this.tool.command, args, {
        name: 'xterm-256color',
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
        cwd: this.workingDir,
        env: process.env
      });

      logger.success(`${this.tool.displayName} started (PID: ${this.ptyProcess.pid})`);

      // Handle PTY data output
      this.ptyProcess.onData((data) => {
        this.handlePTYOutput(data);
      });

      // Handle PTY exit
      this.ptyProcess.onExit((exitCode) => {
        this.handlePTYExit(exitCode);
      });

      return true;
    } catch (err) {
      logger.error(`Failed to start ${this.tool.displayName}: ${err.message}`);
      return false;
    }
  }

  // Handle PTY output
  handlePTYOutput(data) {
    // Add to circular buffer
    this.buffer.append(data);

    // Show locally
    process.stdout.write(data);

    // Call external callback (for WebSocket transmission)
    if (this.onDataCallback) {
      this.onDataCallback(data);
    }
  }

  // Handle PTY exit
  handlePTYExit(exitCode) {
    logger.info(`${this.tool.displayName} exited with code ${exitCode.exitCode}`);

    if (this.onExitCallback) {
      this.onExitCallback(exitCode);
    }
  }

  // Write input to PTY
  write(data) {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
      return true;
    }
    return false;
  }

  // Resize PTY
  resize(cols, rows) {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
      logger.debug(`PTY resized to ${cols}x${rows}`);
    }
  }

  // Set data callback (for sending to WebSocket)
  onData(callback) {
    this.onDataCallback = callback;
  }

  // Set exit callback
  onExit(callback) {
    this.onExitCallback = callback;
  }

  // Kill PTY process
  kill() {
    if (this.ptyProcess) {
      logger.debug('Killing PTY process');
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }

  // Check if PTY is running
  isRunning() {
    return this.ptyProcess !== null;
  }

  // Get PTY PID
  getPid() {
    return this.ptyProcess ? this.ptyProcess.pid : null;
  }
}

module.exports = PTYManager;
