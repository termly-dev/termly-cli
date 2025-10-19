const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// AI Tools Registry
const AI_TOOLS = {
  'claude-code': {
    key: 'claude-code',
    command: 'claude',
    args: ['code'],
    displayName: 'Claude Code',
    description: 'Anthropic\'s AI coding assistant',
    website: 'https://docs.claude.com',
    checkInstalled: async () => await commandExists('claude')
  },
  'aider': {
    key: 'aider',
    command: 'aider',
    args: [],
    displayName: 'Aider',
    description: 'AI pair programming in your terminal',
    website: 'https://aider.chat',
    checkInstalled: async () => await commandExists('aider')
  },
  'github-copilot': {
    key: 'github-copilot',
    command: 'github-copilot-cli',
    args: [],
    displayName: 'GitHub Copilot CLI',
    description: 'GitHub\'s command line AI',
    website: 'https://github.com/features/copilot',
    checkInstalled: async () => await commandExists('github-copilot-cli')
  },
  'cursor': {
    key: 'cursor',
    command: 'cursor',
    args: [],
    displayName: 'Cursor',
    description: 'AI-first code editor',
    website: 'https://cursor.sh',
    checkInstalled: async () => await commandExists('cursor')
  },
  'cody': {
    key: 'cody',
    command: 'cody',
    args: ['chat'],
    displayName: 'Cody',
    description: 'Sourcegraph\'s AI assistant',
    website: 'https://sourcegraph.com/cody',
    checkInstalled: async () => await commandExists('cody')
  }
};

// Check if command exists
async function commandExists(command) {
  try {
    await execAsync(`command -v ${command}`);
    return true;
  } catch {
    return false;
  }
}

// Get tool version
async function getToolVersion(tool) {
  try {
    const { stdout } = await execAsync(`${tool.command} --version 2>&1 || ${tool.command} -v 2>&1`);
    return parseVersion(stdout);
  } catch {
    return 'unknown';
  }
}

// Parse version from output
function parseVersion(output) {
  const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
  if (versionMatch) {
    return versionMatch[1];
  }

  const simpleMatch = output.match(/(\d+\.\d+)/);
  if (simpleMatch) {
    return simpleMatch[1];
  }

  return 'unknown';
}

// Get tool by key
function getToolByKey(key) {
  // Normalize key
  const normalizedKey = key.toLowerCase().replace(/\s+/g, '-');

  // Try exact match
  if (AI_TOOLS[normalizedKey]) {
    return AI_TOOLS[normalizedKey];
  }

  // Try fuzzy match
  for (const [toolKey, tool] of Object.entries(AI_TOOLS)) {
    if (tool.displayName.toLowerCase() === key.toLowerCase()) {
      return tool;
    }
    if (tool.command === key) {
      return tool;
    }
  }

  return null;
}

// Get all tools
function getAllTools() {
  return Object.values(AI_TOOLS);
}

module.exports = {
  AI_TOOLS,
  commandExists,
  getToolVersion,
  parseVersion,
  getToolByKey,
  getAllTools
};
