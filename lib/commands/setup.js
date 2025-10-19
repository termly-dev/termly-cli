const inquirer = require('inquirer');
const chalk = require('chalk');
const { setServerUrl } = require('../config/manager');
const logger = require('../utils/logger');

async function setupCommand() {
  console.log(chalk.bold.cyan('Termly CLI Setup'));
  console.log('');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'serverUrl',
      message: 'Server URL:',
      default: 'wss://api.termly.dev',
      validate: (input) => {
        if (!input) return 'Server URL is required';
        if (!input.startsWith('ws://') && !input.startsWith('wss://')) {
          return 'Server URL must start with ws:// or wss://';
        }
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Save configuration?',
      default: true
    }
  ]);

  if (answers.confirm) {
    setServerUrl(answers.serverUrl);
    console.log('');
    logger.success('Configuration saved!');
    console.log('');
    console.log('You can now start using Termly:');
    console.log(chalk.cyan('  termly start'));
  } else {
    console.log('');
    logger.warn('Configuration not saved');
  }
}

module.exports = setupCommand;
