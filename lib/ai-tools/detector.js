const { getAllTools, getToolVersion } = require('./registry');
const logger = require('../utils/logger');

// Detect all installed AI tools
async function detectInstalledTools() {
  const allTools = getAllTools();
  const installedTools = [];

  logger.debug('Detecting installed AI tools...');

  for (const tool of allTools) {
    // Skip demo mode from auto-detection (only available via --ai demo)
    if (tool.key === 'demo') {
      continue;
    }

    try {
      const isInstalled = await tool.checkInstalled();

      if (isInstalled) {
        const version = await getToolVersion(tool);

        installedTools.push({
          ...tool,
          version,
          installed: true
        });

        logger.debug(`Found: ${tool.displayName} v${version}`);
      }
    } catch (err) {
      logger.debug(`Check failed for ${tool.displayName}: ${err.message}`);
    }
  }

  logger.debug(`Detected ${installedTools.length} installed AI tools`);

  return installedTools;
}

// Check if specific tool is installed
async function isToolInstalled(toolKey) {
  const { getToolByKey } = require('./registry');
  const tool = getToolByKey(toolKey);

  if (!tool) {
    return { installed: false, error: 'Unknown tool' };
  }

  try {
    const isInstalled = await tool.checkInstalled();

    if (isInstalled) {
      const version = await getToolVersion(tool);
      return {
        installed: true,
        tool: {
          ...tool,
          version
        }
      };
    }

    return { installed: false, tool };
  } catch (err) {
    return { installed: false, tool, error: err.message };
  }
}

module.exports = {
  detectInstalledTools,
  isToolInstalled
};
