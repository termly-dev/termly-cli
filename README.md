# Termly CLI

Access your AI coding assistants from any device. Works with Claude Code, Aider, GitHub Copilot, Cursor, and any terminal-based AI tool.

## Features

- 🚀 **Universal AI Tool Support** - Works with any terminal-based AI coding assistant
- 📱 **Mobile Access** - Control your AI tools from phone or tablet
- 🔒 **End-to-End Encryption** - AES-256-GCM + DH-2048 key exchange
- 🔄 **Session Resume** - Automatic reconnection with state synchronization
- 💻 **Multiple Sessions** - Run multiple AI tools simultaneously
- 🎯 **Auto-Detection** - Automatically finds installed AI tools
- ⚡ **Zero-Knowledge Server** - Server never sees your unencrypted data
- 🌍 **Multiple Environments** - Production, Development, and Local modes

## Installation

### Production (Stable)

```bash
# Via npm (recommended):
npm install -g @termly-dev/cli

# Via install script:
curl -fsSL https://get.termly.dev | bash
```

After installation, the `termly` command is available globally.

### Development (Beta Testing)

For beta testers and development:

```bash
npm install -g @termly-dev/cli-dev
```

This installs the `termly-dev` command which connects to the development environment.

## Environments

Termly CLI supports three environments:

| Environment | Package | Command | Server URL | Use Case |
|------------|---------|---------|------------|----------|
| **Production** | `@termly-dev/cli` | `termly` | `wss://api.termly.dev` | End users |
| **Development** | `@termly-dev/cli-dev` | `termly-dev` | `wss://dev-api.termly.dev` | Beta testers |
| **Local** | Run from source | `TERMLY_ENV=local termly` | `ws://localhost:3000` | Developers only |

**Note:** Server URLs are hardcoded per environment and cannot be changed by users.

## Quick Start

### Production

```bash
cd /path/to/your/project
termly start
```

### Development

```bash
cd /path/to/your/project
termly-dev start
```

### Local Development

```bash
# Clone the repo
git clone https://github.com/termly-dev/termly-cli
cd termly-cli
npm install

# Run with local environment
TERMLY_ENV=local node bin/cli.js start
```

## Multiple Sessions

Run multiple sessions simultaneously:

```bash
# Terminal 1
cd ~/frontend
termly start

# Terminal 2 (new window)
cd ~/backend
termly start
```

Each session:
- Independent AI tool instance
- Own WebSocket connection
- Can connect one mobile device

Manage sessions:

```bash
termly status        # Show all sessions
termly stop abc-123  # Stop specific session
termly list          # Quick list
```

## Supported AI Tools

Termly CLI supports **17 interactive terminal-based AI coding assistants**:

### Official Tools from Major Companies
- **Claude Code** (Anthropic) - AI coding assistant
- **OpenAI Codex CLI** (OpenAI) - Official Codex CLI (April 2025)
- **Google Gemini CLI** (Google) - 1M token context
- **GitHub Copilot CLI** (Microsoft) - Command line AI
- **Cody CLI** (Sourcegraph) - AI assistant (Beta)
- **Amazon Q Developer** (AWS) - Free tier available
- **Grok CLI** (xAI/Elon Musk) - Grok AI assistant

### Popular Open-Source Tools
- **Aider** - AI pair programming (35k+ stars)
- **Continue CLI** - Modular architecture
- **OpenHands** - Open-source Devin alternative
- **OpenCode** - Terminal-native (26k+ stars)
- **Mentat** - Git integration
- **Cursor Agent** - From Cursor ecosystem

### Specialized Tools
- **ChatGPT CLI** - ChatGPT in terminal
- **ShellGPT** - Shell command assistant
- **Ollama** - Run LLMs locally (CodeLlama, etc)
- **Blackbox AI** - Debugging & file editing

**And more...** - Works with any terminal-based AI tool

## Commands

All commands work the same way in both `termly` (production) and `termly-dev` (development).

### Setup

```bash
termly setup
```

Interactive configuration setup (optional - sets default AI tool preference).

### Start

```bash
termly start [directory] [options]
```

Start a new session with AI tool.

Options:
- `--ai <tool>` - Specify AI tool to use
- `--ai-args <args>` - Additional arguments for AI tool
- `--no-auto-detect` - Disable auto-detection
- `--debug` - Enable debug logging

Examples:

```bash
# Auto-detect and start
termly start

# Use Aider explicitly
termly start --ai aider

# Use Claude Code with custom directory
termly start /path/to/project --ai "claude code"

# Pass arguments to AI tool
termly start --ai aider --ai-args "--model gpt-4"
```

### Status

```bash
termly status [--all]
```

Show all active sessions with detailed information.

### Stop

```bash
termly stop [session-id] [--all]
```

Stop one or all sessions.

### List

```bash
termly list
```

Quick list of active sessions.

### Tools

```bash
termly tools list           # List available AI tools
termly tools detect         # Detect installed tools
termly tools info <tool>    # Show tool information
```

### Config

```bash
termly config               # Show current configuration
termly config get <key>     # Get config value
termly config set <key> <value>  # Set config value
```

Examples:

```bash
termly config set defaultAI aider
termly config get defaultAI
```

**Note:** Server URL is determined by environment and cannot be changed via config.

### Cleanup

```bash
termly cleanup
```

Remove stale sessions (processes that are no longer running).

## Requirements

- Node.js 18+
- At least one AI coding assistant installed
- Mobile app (iOS/Android)

## Troubleshooting

**No AI tools detected?**

```bash
termly tools list  # Check what's installed
```

Install an AI tool:
- Claude Code: https://docs.claude.com
- Aider: `pip install aider-chat`
- GitHub Copilot: `gh extension install github/gh-copilot`

**Session already running?**

```bash
termly status       # Find session ID
termly stop abc-123 # Stop it
```

**Check your environment:**

```bash
termly config  # Shows current environment and server URL
```

**Logs:** `~/.termly/logs/cli.log`

For issues: https://github.com/termly-dev/termly-cli/issues

## Security

- **End-to-end encryption** (AES-256-GCM)
- **Diffie-Hellman** key exchange (2048-bit)
- **Zero-knowledge server** - Server cannot decrypt your data
- **One mobile device per session**
- **Environment isolation** - Production and development separated
- **Open source** - Audit the code yourself

## Development

```bash
# Install dependencies
npm install

# Run production mode
node bin/cli.js start

# Run development mode
node bin/cli-dev.js start

# Run local mode (custom server)
TERMLY_ENV=local node bin/cli.js start

# Debug mode
DEBUG=1 node bin/cli.js start --debug
```

## Publishing

### Production Release

```bash
npm publish
```

### Development Release

```bash
# Temporarily swap package files
cp package.dev.json package.json
npm publish
git checkout package.json
```

## License

MIT

## Links

- Website: https://termly.dev
- Development: https://dev.termly.dev
- Documentation: https://termly.dev/docs
- GitHub: https://github.com/termly-dev/termly-cli
- Issues: https://github.com/termly-dev/termly-cli/issues

---

Made with ❤️ by the Termly Team
