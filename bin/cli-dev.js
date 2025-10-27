#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

// Import commands
const setupCommand = require('../lib/commands/setup');
const startCommand = require('../lib/commands/start');
const statusCommand = require('../lib/commands/status');
const stopCommand = require('../lib/commands/stop');
const listCommand = require('../lib/commands/list');
const toolsCommand = require('../lib/commands/tools');
const configCommand = require('../lib/commands/config');
const cleanupCommand = require('../lib/commands/cleanup');

const program = new Command();

// Configure program
program
  .name('termly-dev')
  .description('Mirror your AI coding sessions to mobile - control 17+ tools from your phone (Development)')
  .version(packageJson.version, '-v, --version', 'Show version');

// Setup command
program
  .command('setup')
  .description('Interactive setup')
  .action(async () => {
    await setupCommand();
  });

// Start command
program
  .command('start [directory]')
  .description('Start AI tool with remote access')
  .option('--ai <tool>', 'Specify AI tool to use')
  .option('--ai-args <args>', 'Additional arguments for AI tool')
  .option('--no-auto-detect', 'Disable AI tool auto-detection')
  .option('--debug', 'Enable debug logging')
  .action(async (directory, options) => {
    await startCommand(directory, options);
  });

// Status command
program
  .command('status')
  .description('Show session status')
  .option('--all', 'Show all sessions including stopped')
  .action(async (options) => {
    await statusCommand(options);
  });

// Stop command
program
  .command('stop [session-id]')
  .description('Stop session(s)')
  .option('--all', 'Stop all sessions')
  .action(async (sessionId, options) => {
    await stopCommand(sessionId, options);
  });

// List command
program
  .command('list')
  .description('List active sessions')
  .action(async () => {
    await listCommand();
  });

// Tools command
program
  .command('tools <action> [tool-name]')
  .description('Manage AI tools (actions: list, detect, info)')
  .action(async (action, toolName) => {
    await toolsCommand(action, toolName);
  });

// Config command
program
  .command('config [action] [key] [value]')
  .description('Manage configuration (actions: get, set)')
  .action(async (action, key, value) => {
    await configCommand(action, key, value);
  });

// Cleanup command
program
  .command('cleanup')
  .description('Remove stale sessions')
  .action(async () => {
    await cleanupCommand();
  });

// Help command customization
program.on('--help', () => {
  console.log('');
  console.log(chalk.yellow('⚠️  Development version - connects to dev-api.termly.dev'));
  console.log('');
  console.log('Examples:');
  console.log('  $ termly-dev start                          # Auto-detect AI tool');
  console.log('  $ termly-dev start --ai aider               # Use Aider');
  console.log('  $ termly-dev start --ai "claude code"       # Use Claude Code');
  console.log('  $ termly-dev tools list                     # List available tools');
  console.log('  $ termly-dev status                         # Show all sessions');
  console.log('');
  console.log('Special modes:');
  console.log('  --ai demo    Demo mode for testing (no AI agent installation required)');
  console.log('');
  console.log('Multiple Sessions:');
  console.log('  You can run multiple sessions simultaneously:');
  console.log('');
  console.log('  Terminal 1:');
  console.log('    $ cd ~/frontend');
  console.log('    $ termly-dev start');
  console.log('');
  console.log('  Terminal 2:');
  console.log('    $ cd ~/backend');
  console.log('    $ termly-dev start');
  console.log('');
  console.log('  Each session is independent with its own AI tool.');
  console.log('');
  console.log('Supported AI Tools:');
  console.log('  • Claude Code');
  console.log('  • Aider');
  console.log('  • GitHub Copilot CLI');
  console.log('  • Cursor');
  console.log('  • Continue');
  console.log('  • Cody');
  console.log('  • And more...');
  console.log('');
  console.log('About Termly:');
  console.log('  Termly mirrors your AI coding workflow to mobile in real time.');
  console.log('  Your existing tools (Claude, Aider, Copilot, and more) stay with you');
  console.log('  wherever you go — secured with end-to-end encryption.');
  console.log('');
  console.log('Website: https://termly.dev');
  console.log('Support: https://ko-fi.com/termly');
  console.log('');
});

// Parse arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
