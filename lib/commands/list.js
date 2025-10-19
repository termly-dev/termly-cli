const chalk = require('chalk');
const { getRunningSessions } = require('../session/registry');

async function listCommand() {
  const sessions = getRunningSessions();

  if (sessions.length === 0) {
    console.log(chalk.yellow('No active sessions'));
    console.log('');
    console.log(`Start a new session: ${chalk.cyan('termly start')}`);
    return;
  }

  console.log(`${sessions.length} active session${sessions.length > 1 ? 's' : ''}:`);

  sessions.forEach(session => {
    const mobileIcon = session.mobileConnected ? chalk.green('🟢') : chalk.red('🔴');
    const mobileText = session.mobileConnected ? chalk.green('(Mobile connected)') : '';

    console.log(`  • ${chalk.cyan(session.sessionId.substring(0, 8))}  ${chalk.bold(session.projectName.padEnd(20))}  ${session.aiToolDisplayName.padEnd(15)}  ${mobileIcon} ${mobileText}`);
  });

  console.log('');
  console.log(`Use ${chalk.cyan('termly status')} for details.`);
}

module.exports = listCommand;
