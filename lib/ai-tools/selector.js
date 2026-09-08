const inquirer = require('inquirer');
const chalk = require('chalk');
const { detectInstalledTools, isToolInstalled } = require('./detector');
const { getToolByKey } = require('./registry');
const { getDefaultAI } = require('../config/manager');
const logger = require('../utils/logger');

// Select AI tool based on options
async function selectAITool(options) {
  // Manual selection via --ai flag
  if (options.ai) {
    logger.debug(`Manual tool selection: ${options.ai}`);
    return await selectManualTool(options.ai);
  }

  // Configured default (termly setup / termly config set defaultAI <tool>)
  const configuredTool = await selectConfiguredDefault();
  if (configuredTool) {
    return configuredTool;
  }

  // No auto-detect mode
  if (options.noAutoDetect) {
    console.error(chalk.red('❌ Please specify AI tool with --ai flag'));
    console.error('');
    console.error('Examples:');
    console.error('  termly start --ai aider');
    console.error('  termly start --ai "claude code"');
    console.error('');
    process.exit(1);
  }

  // Auto-detect mode
  return await autoSelectTool();
}

// Configured default tool selection
//
// Unlike --ai, `defaultAI` is a stored preference that may have been set long
// ago, so a stale value must never kill `termly start`: warn and let the caller
// fall back to auto-detection.
async function selectConfiguredDefault() {
  const defaultAI = getDefaultAI();

  if (!defaultAI) {
    return null;
  }

  logger.debug(`Configured defaultAI: ${defaultAI}`);

  const tool = getToolByKey(defaultAI);

  if (!tool) {
    logger.warn(`Configured default AI "${defaultAI}" is unknown - falling back to auto-detection`);
    console.log(chalk.dim('   Change it with: termly config set defaultAI <tool>'));
    return null;
  }

  const result = await isToolInstalled(tool.key);

  if (!result.installed) {
    logger.warn(`Configured default AI ${tool.displayName} is not installed - falling back to auto-detection`);
    console.log(chalk.dim('   Change it with: termly config set defaultAI <tool>'));
    return null;
  }

  console.log(chalk.green(`Using ${result.tool.displayName} v${result.tool.version} (configured default)`));
  return result.tool;
}

// Manual tool selection
async function selectManualTool(toolName) {
  const tool = getToolByKey(toolName);

  if (!tool) {
    console.error(chalk.red(`❌ Unknown AI tool: ${toolName}`));
    console.error('');
    console.error('Available tools:');
    console.error('  • Claude Code');
    console.error('  • Aider');
    console.error('  • GitHub Copilot CLI');
    console.error('  • Cursor');
    console.error('  • Continue');
    console.error('  • Cody');
    console.error('  • And more...');
    console.error('');
    console.error('Use: termly tools list');
    process.exit(1);
  }

  const result = await isToolInstalled(tool.key);

  if (!result.installed) {
    console.error(chalk.red(`❌ ${tool.displayName} is not installed`));
    console.error('');
    console.error(`Install it:`);
    console.error(`  ${getInstallInstructions(tool)}`);
    console.error('');
    console.error('Or use auto-detection:');
    console.error('  termly start');
    process.exit(1);
  }

  console.log(chalk.green(`Using ${result.tool.displayName} v${result.tool.version}`));
  return result.tool;
}

// Auto-detect and select tool
async function autoSelectTool() {
  logger.debug('Auto-detecting AI tools...');

  const installedTools = await detectInstalledTools();

  if (installedTools.length === 0) {
    console.error(chalk.red('❌ No AI tools detected'));
    console.error('');
    console.error('Please install an AI coding assistant:');
    console.error('  • Claude Code');
    console.error('  • Aider');
    console.error('  • GitHub Copilot CLI');
    console.error('  • Cursor');
    console.error('  • Continue');
    console.error('  • Cody');
    console.error('  • And more...');
    console.error('');
    console.error('See all tools: termly tools list');
    console.error('Then try again: termly start');
    console.error('');
    console.error(chalk.dim('Or try demo mode (no installation required):'));
    console.error(chalk.cyan('  termly start --ai demo'));
    process.exit(1);
  }

  if (installedTools.length === 1) {
    const tool = installedTools[0];
    console.log(chalk.green(`✓ Using ${tool.displayName} v${tool.version} (auto-detected)`));
    return tool;
  }

  // Multiple tools found - ask user
  console.log(chalk.yellow('Multiple AI tools detected:'));
  console.log('');

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'tool',
      message: 'Which tool would you like to use?',
      choices: installedTools.map(t => ({
        name: `${t.displayName} (${t.command}) - v${t.version}`,
        value: t.key
      }))
    }
  ]);

  const selectedTool = installedTools.find(t => t.key === answer.tool);
  console.log(chalk.green(`✓ Using ${selectedTool.displayName} v${selectedTool.version}`));

  return selectedTool;
}

// Get installation instructions for a tool
function getInstallInstructions(tool) {
  const instructions = {
    'claude-code': 'https://docs.claude.com',
    'aider': 'pip install aider-chat',
    'github-copilot': 'gh extension install github/gh-copilot',
    'cursor': 'https://cursor.com/blog/cli',
    'continue': 'npm install -g continue-dev',
    'cody': 'npm install -g @sourcegraph/cody'
  };

  return instructions[tool.key] || tool.website;
}

module.exports = {
  selectAITool,
  selectManualTool,
  autoSelectTool
};
