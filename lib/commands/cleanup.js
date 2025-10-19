const inquirer = require('inquirer');
const chalk = require('chalk');
const { getStaleSessions, removeStaleSessions } = require('../session/registry');
const logger = require('../utils/logger');

async function cleanupCommand() {
  const staleSessions = getStaleSessions();

  if (staleSessions.length === 0) {
    logger.success('No stale sessions found');
    console.log('');
    console.log('All sessions are clean!');
    return;
  }

  console.log(chalk.yellow(`Found ${staleSessions.length} stale session${staleSessions.length > 1 ? 's' : ''}:`));
  console.log('');

  staleSessions.forEach(session => {
    console.log(`  • ${chalk.gray(session.sessionId.substring(0, 8))} (${session.projectName}) - PID ${session.pid} not found`);
  });

  console.log('');

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Remove stale sessions?`,
      default: true
    }
  ]);

  if (!answer.confirm) {
    console.log('Cancelled');
    return;
  }

  const count = removeStaleSessions();

  console.log('');
  logger.success(`Removed ${count} stale session${count > 1 ? 's' : ''}`);
}

module.exports = cleanupCommand;
