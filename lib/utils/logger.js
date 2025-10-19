const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

const LOG_DIR = path.join(os.homedir(), '.termly', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'cli.log');

// Ensure log directory exists
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Format timestamp
function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// Write to log file
function writeToFile(level, message) {
  try {
    ensureLogDir();
    const entry = `[${timestamp()}] ${level}: ${message}\n`;
    fs.appendFileSync(LOG_FILE, entry);
  } catch (err) {
    // Silently fail if can't write to log
  }
}

const logger = {
  debug: (message) => {
    if (process.env.DEBUG === '1' || process.argv.includes('--debug')) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
      writeToFile('DEBUG', message);
    }
  },

  info: (message) => {
    console.log(chalk.blue(`ℹ ${message}`));
    writeToFile('INFO', message);
  },

  success: (message) => {
    console.log(chalk.green(`✓ ${message}`));
    writeToFile('INFO', message);
  },

  warn: (message) => {
    console.log(chalk.yellow(`⚠️  ${message}`));
    writeToFile('WARN', message);
  },

  error: (message) => {
    console.error(chalk.red(`❌ ${message}`));
    writeToFile('ERROR', message);
  },

  log: (message) => {
    console.log(message);
  }
};

module.exports = logger;
