const inquirer = require('inquirer');
const chalk = require('chalk');
const { getRunningSessions, getSessionById, getSessionByDirectory, updateSession, removeSession } = require('../session/registry');
const { killProcessGracefully, isPidAlive } = require('../utils/pid');
const logger = require('../utils/logger');

async function stopCommand(sessionId, options) {
  // Stop all sessions
  if (options.all) {
    return await stopAllSessions();
  }

  // Stop specific session by ID
  if (sessionId) {
    return await stopSessionById(sessionId);
  }

  // Stop current directory session
  const currentDir = process.cwd();
  const currentSession = getSessionByDirectory(currentDir);

  if (currentSession) {
    return await stopSessionById(currentSession.sessionId);
  }

  // Stop last created session if no ID provided
  const sessions = getRunningSessions();

  if (sessions.length === 1) {
    // Only one session - stop it without asking
    console.log(chalk.yellow('Stopping the only active session...'));
    return await stopSessionById(sessions[0].sessionId);
  } else if (sessions.length > 1) {
    // Multiple sessions - stop the most recent one
    const lastSession = sessions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    console.log(chalk.yellow(`Stopping most recent session: ${lastSession.projectName} (${lastSession.sessionId.substring(0, 8)})`));
    return await stopSessionById(lastSession.sessionId);
  }

  // No sessions found
  logger.warn('No active sessions to stop');
  console.log('');
  console.log(`Start a new session: ${chalk.cyan('termly start')}`);
}

async function stopAllSessions() {
  const sessions = getRunningSessions();

  if (sessions.length === 0) {
    logger.warn('No active sessions to stop');
    return;
  }

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Stop all ${sessions.length} sessions?`,
      default: false
    }
  ]);

  if (!answer.confirm) {
    console.log('Cancelled');
    return;
  }

  console.log('');
  for (const session of sessions) {
    await stopSessionById(session.sessionId, false);
  }

  logger.success(`Stopped ${sessions.length} sessions`);
}

async function stopSessionById(sessionId, verbose = true) {
  const session = getSessionById(sessionId);

  if (!session) {
    logger.error(`Session not found: ${sessionId}`);
    return false;
  }

  if (verbose) {
    console.log(`Stopping session: ${session.projectName} (${session.aiToolDisplayName})`);
  }

  // Check if process is still alive
  if (!isPidAlive(session.pid)) {
    if (verbose) {
      logger.warn('Process is not running');
    }
    updateSession(session.sessionId, { status: 'stopped' });
    return true;
  }

  // Kill process gracefully
  const result = await killProcessGracefully(session.pid, 5000);

  if (result.success) {
    if (verbose) {
      logger.success(`Session stopped (${result.method})`);
    }
    updateSession(session.sessionId, { status: 'stopped' });
    return true;
  } else {
    logger.error('Failed to stop session');
    return false;
  }
}

async function interactiveStop() {
  const sessions = getRunningSessions();

  if (sessions.length === 0) {
    logger.warn('No active sessions to stop');
    console.log('');
    console.log(`Start a new session: ${chalk.cyan('termly start')}`);
    return;
  }

  const choices = sessions.map(s => ({
    name: `${s.projectName} (${s.sessionId.substring(0, 8)}) - ${s.aiToolDisplayName}`,
    value: s.sessionId
  }));

  choices.push({
    name: chalk.gray('[Cancel]'),
    value: null
  });

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'sessionId',
      message: 'Which session to stop?',
      choices
    }
  ]);

  if (!answer.sessionId) {
    console.log('Cancelled');
    return;
  }

  await stopSessionById(answer.sessionId);
}

module.exports = stopCommand;
