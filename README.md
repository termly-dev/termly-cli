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

## Installation

```bash
# Via install script:
curl -fsSL https://get.termly.dev | bash

# Or via npm:
npm install -g termly-cli
```

After installation, the `termly` command is available globally.

## Quick Start

1. Start in your project (auto-detects AI tools):

```bash
cd /path/to/your/project
termly start
```

2. Or specify AI tool explicitly:

```bash
termly start --ai aider
termly start --ai "claude code"
```

3. Scan the QR code with your mobile app

4. Code from anywhere!

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

- **Claude Code** - Anthropic's AI coding assistant
- **Aider** - AI pair programming in your terminal
- **GitHub Copilot CLI** - GitHub's command line AI
- **Cursor** - AI-first code editor
- **Cody** - Sourcegraph's AI assistant
- **And more...** - Works with any terminal-based tool

## Commands

### Setup

```bash
termly setup
```

Interactive configuration setup.

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
termly config set serverUrl wss://custom.server.com
termly config set defaultAI aider
```

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

**Logs:** `~/.termly/logs/cli.log`

For issues: https://github.com/termly-dev/termly-cli/issues

## Security

- **End-to-end encryption** (AES-256-GCM)
- **Diffie-Hellman** key exchange (2048-bit)
- **Zero-knowledge server** - Server cannot decrypt your data
- **One mobile device per session**
- **Open source** - Audit the code yourself

## Project Structure

```
termly-cli/
├── bin/
│   └── cli.js                 # Main entry point
├── lib/
│   ├── commands/              # CLI commands
│   ├── ai-tools/              # AI tool management
│   ├── session/               # Session management
│   ├── network/               # WebSocket & reconnection
│   ├── crypto/                # Encryption (DH + AES)
│   ├── utils/                 # Utilities
│   └── config/                # Configuration
├── package.json
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Run locally
node bin/cli.js start

# Debug mode
DEBUG=1 node bin/cli.js start --debug
```

## License

MIT

## Links

- Website: https://termly.dev
- Documentation: https://termly.dev/docs
- GitHub: https://github.com/termly-dev/termly-cli
- Issues: https://github.com/termly-dev/termly-cli/issues

---

Made with ❤️ by the Termly Team
