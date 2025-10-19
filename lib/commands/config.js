const chalk = require('chalk');
const { getConfig, setConfig, getConfigPath } = require('../config/manager');
const { SESSIONS_FILE } = require('../session/registry');
const logger = require('../utils/logger');

async function configShowCommand() {
  const config = getConfig();

  console.log(chalk.bold('Current Configuration:'));
  console.log('');
  console.log(`${chalk.gray('Server URL:')}     ${config.serverUrl}`);
  console.log(`${chalk.gray('Default AI:')}     ${config.defaultAI || '(auto-detect)'}`);
  console.log(`${chalk.gray('Config file:')}    ${getConfigPath()}`);
  console.log(`${chalk.gray('Sessions file:')}  ${SESSIONS_FILE}`);
  console.log(`${chalk.gray('Last updated:')}   ${config.lastUpdated || 'Never'}`);
  console.log('');
  console.log(`To change: ${chalk.cyan('termly config set <key> <value>')}`);
}

async function configGetCommand(key) {
  if (!key) {
    return configShowCommand();
  }

  const value = getConfig(key);

  if (value === undefined) {
    console.error(chalk.red(`Unknown config key: ${key}`));
    console.error('');
    console.error('Available keys: serverUrl, defaultAI');
    return;
  }

  console.log(value);
}

async function configSetCommand(key, value) {
  if (!key || !value) {
    console.error(chalk.red('Usage: termly config set <key> <value>'));
    console.error('');
    console.error('Examples:');
    console.error(chalk.cyan('  termly config set serverUrl wss://custom.server.com'));
    console.error(chalk.cyan('  termly config set defaultAI aider'));
    return;
  }

  const validKeys = ['serverUrl', 'defaultAI'];

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
