const Conf = require('conf');
const path = require('path');
const os = require('os');

// Config schema - only user preferences, no environment config
const schema = {
  defaultAI: {
    type: 'string',
    default: ''
  },
  version: {
    type: 'string',
    default: '1.0.0'
  },
  lastUpdated: {
    type: 'string',
    default: ''
  }
};

// Create config instance
const config = new Conf({
  projectName: 'termly',
  cwd: path.join(os.homedir(), '.termly'),
  configName: 'config',
  schema
});

// Get config value
function getConfig(key) {
  if (key) {
    return config.get(key);
  }
  return config.store;
}

// Set config value
function setConfig(key, value) {
  config.set(key, value);
  config.set('lastUpdated', new Date().toISOString());
}

// Get default AI tool
function getDefaultAI() {
  const value = config.get('defaultAI');
  return value || null;
}

// Set default AI tool
function setDefaultAI(tool) {
  setConfig('defaultAI', tool);
}

// Get config file path
function getConfigPath() {
  return config.path;
}

// Reset config to defaults
function resetConfig() {
  config.clear();
}

module.exports = {
  getConfig,
  setConfig,
  getDefaultAI,
  setDefaultAI,
  getConfigPath,
  resetConfig
};
