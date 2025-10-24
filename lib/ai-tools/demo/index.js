#!/usr/bin/env node

const chalk = require('chalk');
const { displayAnimatedLogo } = require('./logo');
const { getRandomResponse } = require('./responses');

const WELCOME_MESSAGE = `
${chalk.bold.hex('#6366F1')('Welcome to Termly Demo Mode!')}

This is a demonstration version with randomized responses.
Feel free to type anything and explore the experience.

${chalk.dim('Special commands:')}
  ${chalk.cyan('/help')} - Show this message
  ${chalk.cyan('/exit')} - Exit demo mode

${chalk.dim('─'.repeat(50))}
`;

const PROMPT = chalk.hex('#6366F1')('❯') + ' ';

/**
 * Display welcome message
 */
function showWelcome() {
  console.log(WELCOME_MESSAGE);
}

/**
 * Process user input and return response
 * @param {string} input - User input
 * @returns {Object} Response object with text and shouldExit flag
 */
function processInput(input) {
  const trimmed = input.trim();

  // Handle special commands
  if (trimmed === '/help') {
    return {
      text: WELCOME_MESSAGE + '\n' + PROMPT,
      shouldExit: false
    };
  }

  if (trimmed === '/exit') {
    return {
      text: chalk.yellow('\nExiting demo mode. Thanks for exploring Termly!\n'),
      shouldExit: true
    };
  }

  // Return random response for any other input
  return {
    text: `\n${chalk.hex('#EC4899')('❯')} ${getRandomResponse()}\n\n${PROMPT}`,
    shouldExit: false
  };
}

/**
 * Main demo loop
 */
async function runDemo() {
  // Show animated logo
  await displayAnimatedLogo(3000, 200);

  // Show welcome message
  showWelcome();

  // Show initial prompt
  process.stdout.write('\n' + PROMPT);

  // Set up stdin for interactive input
  process.stdin.setEncoding('utf8');

  // Only set raw mode if stdin is a TTY
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }

  let buffer = '';

  process.stdin.on('data', (chunk) => {
    buffer += chunk;

    // Check if we have a complete line (ends with newline)
    if (buffer.includes('\n')) {
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      lines.forEach((line) => {
        const result = processInput(line);

        // Output response
        process.stdout.write(result.text);

        // Exit if requested
        if (result.shouldExit) {
          process.exit(0);
        }
      });
    }
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nExiting demo mode. Thanks for exploring Termly!\n'));
    process.exit(0);
  });

  // Keep process alive
  process.stdin.resume();
}

// Run if executed directly
if (require.main === module) {
  runDemo().catch((error) => {
    console.error(chalk.red('Demo error:'), error);
    process.exit(1);
  });
}

module.exports = {
  runDemo,
  processInput,
  showWelcome
};
