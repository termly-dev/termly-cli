const path = require('path');
const fs = require('fs');

// Environment configurations
const ENVIRONMENTS = {
  local: {
    serverUrl: 'ws://localhost:3000',
    apiUrl: 'http://localhost:3000',
    name: 'Local Development'
  },
  dev: {
    serverUrl: 'wss://dev-api.termly.dev',
    apiUrl: 'https://dev-api.termly.dev',
    name: 'Development'
  },
  production: {
    serverUrl: 'wss://api.termly.dev',
    apiUrl: 'https://api.termly.dev',
    name: 'Production'
  }
};

// Determine current environment
function getEnvironment() {
  // 1. Check for local development override
  if (process.env.TERMLY_ENV === 'local') {
    return 'local';
  }

  // 2. Detect by package.json name
  try {
    // Try to find which package.json we're running from
    const cliPath = process.argv[1]; // Path to bin/cli.js or bin/cli-dev.js

    if (cliPath && cliPath.includes('cli-dev.js')) {
      return 'dev';
    }

    // Check if we're running from package.dev.json context
    const packageJsonPath = path.join(__dirname, '../../package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = require(packageJsonPath);
      if (pkg.name === '@termly-dev/cli-dev') {
        return 'dev';
      }
    }
  } catch (err) {
    // Fallback to production if detection fails
  }

  // 3. Default to production
  return 'production';
}

// Get current environment config
function getEnvironmentConfig() {
  const env = getEnvironment();
  return {
    ...ENVIRONMENTS[env],
    environment: env
  };
}

// Get server URL for current environment
function getServerUrl() {
  return getEnvironmentConfig().serverUrl;
}

// Get API URL for current environment
function getApiUrl() {
  return getEnvironmentConfig().apiUrl;
}

// Get environment name
function getEnvironmentName() {
  return getEnvironmentConfig().name;
}

// Check if running in local mode
function isLocal() {
  return getEnvironment() === 'local';
}

// Check if running in dev mode
function isDev() {
  return getEnvironment() === 'dev';
}

// Check if running in production mode
function isProduction() {
  return getEnvironment() === 'production';
}

module.exports = {
  ENVIRONMENTS,
  getEnvironment,
  getEnvironmentConfig,
  getServerUrl,
  getApiUrl,
  getEnvironmentName,
  isLocal,
  isDev,
  isProduction
};
