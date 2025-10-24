#!/usr/bin/env node

const { DemoController } = require('./enhanced-demo');

/**
 * Main demo loop - now uses enhanced demo controller
 */
async function runDemo() {
  const demo = new DemoController();
  demo.start();
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
  DemoController
};
