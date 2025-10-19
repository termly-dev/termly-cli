const inquirer = require('inquirer');
const chalk = require('chalk');
const { setDefaultAI } = require('../config/manager');
const { getEnvironmentName } = require('../config/environment');
const logger = require('../utils/logger');

async function setupCommand() {
  console.log(chalk.bold.cyan('Termly CLI Setup'));
  console.log('');
  console.log(chalk.gray(`Environment: ${getEnvironmentName()}`));
  console.log('');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'defaultAI',
      message: 'Default AI tool (leave empty for auto-detect):',
      default: ''
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Save configuration?',
      default: true
    }
  ]);

  if (answers.confirm) {
    if (answers.defaultAI) {
      setDefaultAI(answers.defaultAI);
    }
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
