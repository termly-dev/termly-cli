const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// AI Tools Registry
const AI_TOOLS = {
  'claude-code': {
    key: 'claude-code',
    command: 'claude',
    args: [],
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
  'codex': {
    key: 'codex',
    command: 'codex',
    args: [],
    displayName: 'OpenAI Codex CLI',
    description: 'Official OpenAI Codex CLI (launched April 2025)',
    website: 'https://openai.com/codex',
    checkInstalled: async () => await commandExists('codex')
  },
  'github-copilot': {
    key: 'github-copilot',
    command: 'copilot',
    args: [],
    displayName: 'GitHub Copilot CLI',
    description: 'GitHub\'s command line AI',
    website: 'https://github.com/features/copilot',
    checkInstalled: async () => await commandExists('copilot')
  },
  'cody': {
    key: 'cody',
    command: 'cody',
    args: ['chat'],
    displayName: 'Cody CLI',
    description: 'Sourcegraph\'s AI assistant (Beta)',
    website: 'https://sourcegraph.com/cody',
    checkInstalled: async () => await commandExists('cody')
  },
  'gemini': {
    key: 'gemini',
    command: 'gemini',
    args: [],
    displayName: 'Google Gemini CLI',
    description: 'Official Google Gemini CLI with 1M token context',
    website: 'https://developers.google.com/gemini-code-assist',
    checkInstalled: async () => await commandExists('gemini')
  },
  'continue': {
    key: 'continue',
    command: 'cn',
    args: [],
    displayName: 'Continue CLI',
    description: 'Open-source modular AI coding assistant',
    website: 'https://continue.dev',
    checkInstalled: async () => await commandExists('cn')
  },
  'cursor': {
    key: 'cursor',
    command: 'cursor-agent',
    args: [],
    displayName: 'Cursor Agent CLI',
    description: 'Cursor\'s AI coding assistant CLI (Beta)',
    website: 'https://cursor.com/blog/cli',
    checkInstalled: async () => await commandExists('cursor-agent')
  },
  'chatgpt': {
    key: 'chatgpt',
    command: 'chatgpt',
    args: [],
    displayName: 'ChatGPT CLI',
    description: 'ChatGPT in your terminal (Go implementation)',
    website: 'https://github.com/j178/chatgpt',
    checkInstalled: async () => await commandExists('chatgpt')
  },
  'sgpt': {
    key: 'sgpt',
    command: 'sgpt',
    args: ['--repl', 'temp'],
    displayName: 'ShellGPT',
    description: 'ChatGPT-powered shell assistant with REPL mode',
    website: 'https://github.com/TheR1D/shell_gpt',
    checkInstalled: async () => await commandExists('sgpt')
  },
  'mentat': {
    key: 'mentat',
    command: 'mentat',
    args: [],
    displayName: 'Mentat',
    description: 'AI coding assistant with Git integration',
    website: 'https://www.mentat.ai',
    checkInstalled: async () => await commandExists('mentat')
  },
  'grok': {
    key: 'grok',
    command: 'grok',
    args: [],
    displayName: 'Grok CLI',
    description: 'xAI\'s Grok AI assistant (by Elon Musk)',
    website: 'https://grok.x.ai',
    checkInstalled: async () => await commandExists('grok')
  },
  'ollama': {
    key: 'ollama',
    command: 'ollama',
    args: ['run', 'codellama'],
    displayName: 'Ollama',
    description: 'Run LLMs locally (CodeLlama, Llama, etc)',
    website: 'https://ollama.ai',
    checkInstalled: async () => await commandExists('ollama')
  },
  'openhands': {
    key: 'openhands',
    command: 'openhands',
    args: [],
    displayName: 'OpenHands',
    description: 'Open-source AI software engineer (formerly OpenDevin)',
    website: 'https://github.com/All-Hands-AI/OpenHands',
    checkInstalled: async () => await commandExists('openhands')
  },
  'opencode': {
    key: 'opencode',
    command: 'opencode',
    args: [],
    displayName: 'OpenCode',
    description: 'Open-source terminal-native coding assistant',
    website: 'https://opencode.ai',
    checkInstalled: async () => await commandExists('opencode')
  },
  'blackbox': {
    key: 'blackbox',
    command: 'blackboxai',
    args: [],
    displayName: 'Blackbox AI',
    description: 'AI coding assistant with debugging & file editing',
    website: 'https://blackbox.ai',
    checkInstalled: async () => await commandExists('blackboxai')
  },
  'amazon-q': {
    key: 'amazon-q',
    command: 'q',
    args: [],
    displayName: 'Amazon Q Developer',
    description: 'AWS\'s AI coding companion with free tier',
    website: 'https://aws.amazon.com/q/developer',
    checkInstalled: async () => await commandExists('q')
  },
  'demo': {
    key: 'demo',
    command: 'node',
    args: [require('path').join(__dirname, 'demo', 'index.js')],
    displayName: 'Demo Mode',
    description: 'Interactive demo for testing (no AI installation required)',
    website: 'https://termly.dev',
    checkInstalled: async () => true // Always available
  }
};

// Check if command exists
async function commandExists(command) {
  try {
    const isWindows = process.platform === 'win32';
    const checkCommand = isWindows ? `where ${command}` : `command -v ${command}`;
    await execAsync(checkCommand);
    return true;
  } catch {
    return false;
  }
}

// Get tool version
async function getToolVersion(tool) {
  // Try --version first
  try {
    const { stdout } = await execAsync(`${tool.command} --version 2>&1`);
    const version = parseVersion(stdout);
    if (version !== 'unknown') {
      return version;
    }
  } catch {
    // Ignore error, will try -v next
  }

  // Try -v as fallback
  try {
    const { stdout } = await execAsync(`${tool.command} -v 2>&1`);
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
