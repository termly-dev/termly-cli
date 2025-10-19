const chalk = require('chalk');
const path = require('path');
const { getRunningSessions, getAllSessions, getSessionByDirectory } = require('../session/registry');

function formatUptime(startedAt) {
  const start = new Date(startedAt);
  const now = new Date();
  const uptimeMs = now - start;

  const minutes = Math.floor(uptimeMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else {
    return `${minutes} minutes`;
  }
}

function displaySession(session, index) {
  console.log(chalk.cyan(`╭─────────────────────────────────────────╮`));
  console.log(chalk.cyan(`│ Session ${index + 1}                               │`));
  console.log(chalk.cyan(`├─────────────────────────────────────────┤`));
  console.log(chalk.cyan(`│ Session ID: ${session.sessionId.padEnd(26)}│`));
  console.log(chalk.cyan(`│ Computer:   ${session.computerName.substring(0, 26).padEnd(26)}│`));
  console.log(chalk.cyan(`│ AI Tool:    ${(session.aiToolDisplayName + ' ' + (session.aiToolVersion || '')).substring(0, 26).padEnd(26)}│`));
  console.log(chalk.cyan(`│ Project:    ${session.projectName.substring(0, 26).padEnd(26)}│`));
  console.log(chalk.cyan(`│ Directory:  ${('~/' + path.relative(require('os').homedir(), session.workingDir)).substring(0, 26).padEnd(26)}│`));
  console.log(chalk.cyan(`│ PID:        ${String(session.pid).padEnd(26)}│`));
  console.log(chalk.cyan(`│ Uptime:     ${formatUptime(session.startedAt).padEnd(26)}│`));

  const mobileStatus = session.mobileConnected
    ? chalk.green('🟢 Connected')
    : chalk.red('🔴 Not connected');
  console.log(chalk.cyan(`│ Mobile:     ${mobileStatus}${' '.repeat(26 - 15)}│`));

  const status = session.status === 'running'
    ? chalk.green('🟢 Running')
    : chalk.yellow('⚠️  ' + session.status);
  console.log(chalk.cyan(`│ Status:     ${status}${' '.repeat(26 - 10)}│`));

  console.log(chalk.cyan(`╰─────────────────────────────────────────╯`));
  console.log('');
}

async function statusCommand(options) {
  const currentDir = process.cwd();
  const currentSession = getSessionByDirectory(currentDir);

  if (currentSession && !options.all) {
    console.log(chalk.bold('Current Session:'));
    displaySession(currentSession, 0);

    const runningSessions = getRunningSessions();
    const otherSessions = runningSessions.filter(s => s.sessionId !== currentSession.sessionId);

    if (otherSessions.length > 0) {
      console.log(`Other Active Sessions: ${otherSessions.length}`);
      otherSessions.forEach(s => {
        console.log(chalk.gray(`  • ${s.projectName} (${s.aiToolDisplayName}) - ${s.sessionId.substring(0, 8)}`));
      });
      console.log('');
    }

    console.log(`Use ${chalk.cyan('termly status --all')} to see all sessions.`);
    return;
  }

  const sessions = options.all ? getAllSessions() : getRunningSessions();

  if (sessions.length === 0) {
    console.log(chalk.yellow('No active sessions'));
    console.log('');
    console.log(`Start a new session: ${chalk.cyan('termly start')}`);
    return;
  }

  console.log(chalk.bold(`Active Sessions (${sessions.length}):`));
  console.log('');

  sessions.forEach((session, index) => {
    displaySession(session, index);
  });

  console.log('Commands:');
  console.log(chalk.cyan('  termly stop <session-id>     Stop specific session'));
  console.log(chalk.cyan('  termly stop --all            Stop all sessions'));
}

module.exports = statusCommand;
