const chalk = require('chalk');
const { getConfig, setConfig, getConfigPath } = require('../config/manager');
const { getEnvironmentName, getServerUrl, getApiUrl } = require('../config/environment');
const { SESSIONS_FILE } = require('../session/registry');
const logger = require('../utils/logger');

async function configShowCommand() {
  const config = getConfig();

  console.log(chalk.bold('Current Configuration:'));
  console.log('');
  console.log(chalk.bold.cyan('Environment:'));
  console.log(`  ${getEnvironmentName()}`);
  console.log(`  Server URL:   ${chalk.gray(getServerUrl())}`);
  console.log(`  API URL:      ${chalk.gray(getApiUrl())}`);
  console.log('');
  console.log(chalk.bold.cyan('User Settings:'));
  console.log(`  Default AI:     ${config.defaultAI || '(auto-detect)'}`);
  console.log('');
  console.log(chalk.bold.cyan('Files:'));
  console.log(`  Config file:    ${chalk.gray(getConfigPath())}`);
  console.log(`  Sessions file:  ${chalk.gray(SESSIONS_FILE)}`);
  console.log(`  Last updated:   ${config.lastUpdated || 'Never'}`);
  console.log('');
  console.log(`To change user settings: ${chalk.cyan('termly config set <key> <value>')}`);
  console.log(chalk.gray('Note: Server URL is determined by environment and cannot be changed'));
}

async function configGetCommand(key) {
  if (!key) {
    return configShowCommand();
  }

  const value = getConfig(key);

  if (value === undefined) {
    console.error(chalk.red(`Unknown config key: ${key}`));
    console.error('');
    console.error('Available keys: defaultAI');
    return;
  }

  console.log(value);
}

async function configSetCommand(key, value) {
  if (!key || !value) {
    console.error(chalk.red('Usage: termly config set <key> <value>'));
    console.error('');
    console.error('Examples:');
    console.error(chalk.cyan('  termly config set defaultAI aider'));
    return;
  }

  const validKeys = ['defaultAI'];

  if (!validKeys.includes(key)) {
    console.error(chalk.red(`Invalid config key: ${key}`));
    console.error('');
    console.error(`Valid keys: ${validKeys.join(', ')}`);
    return;
  }

  setConfig(key, value);
  logger.success(`Config updated: ${key} = ${value}`);
}

async function configCommand(action, key, value) {
  if (!action) {
    return configShowCommand();
  }

  switch (action) {
    case 'get':
      await configGetCommand(key);
      break;

    case 'set':
      await configSetCommand(key, value);
      break;

    default:
      // If action looks like a key, treat as 'get'
      await configGetCommand(action);
  }
}

module.exports = configCommand;
