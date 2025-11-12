# Termly CLI

Access your AI coding assistants from any device. Works with Claude Code, Aider, GitHub Copilot, and any terminal-based AI tool.

## What's New in v1.3

- ✨ **No Build Tools Required** - Prebuilt binaries for all platforms (Windows, macOS, Linux)
- 🪟 **Improved Windows Support** - Fixed PATH issues, ConPTY flickering, and command execution
- ⚡ **Fast Installation** - 10-30 seconds instead of minutes
- 🔄 **Auto-Update Check** - CLI version validation on startup
- 🎯 **Enhanced Terminal Handling** - Better resize management and output normalization

**Previous versions:**
- **v1.2** - Windows output deduplication and PowerShell optimization
- **v1.0** - Stable release with session management and E2EE
- **v0.9** - Terminal resize support and improved reconnection
- **v0.8** - Demo mode for Apple App Review

## Features

- 🚀 **Universal AI Tool Support** - Works with any terminal-based AI coding assistant
- 📱 **Mobile Access** - Control your AI tools from phone or tablet
- 🔒 **End-to-End Encryption** - AES-256-GCM + DH-2048 key exchange with fingerprint verification
- 🔄 **Session Resume** - Automatic reconnection with state synchronization
- 💻 **Multiple Sessions** - Run multiple AI tools simultaneously
- 🎯 **Auto-Detection** - Automatically finds installed AI tools
- ⚡ **Zero-Knowledge Server** - Server never sees your unencrypted data
- 🌍 **Multiple Environments** - Production, Development, and Local modes
- 🔄 **Auto-Update Check** - Ensures you're always running a supported version

## Installation

### Quick Install

Termly CLI includes **prebuilt binaries** for all platforms - no compilation required!

**All Platforms:**
```bash
npm install -g @termly-dev/cli
```

After installation, the `termly` command is available globally.

**That's it!** Works out-of-the-box on:
- ✅ macOS (Intel & Apple Silicon)
- ✅ Linux (x64 & ARM64)
- ✅ Windows 10+ (x64 & ARM64)

### Development (Beta Testing)

For beta testers and development:

```bash
npm install -g @termly-dev/cli-dev
```

This installs the `termly-dev` command which connects to the development environment.

### System Requirements

**Node.js 18+** - That's all you need!

Termly CLI uses **@lydell/node-pty** with prebuilt binaries for all platforms:
- **No Visual Studio** required on Windows
- **No Xcode CLI tools** required on macOS
- **No build-essential** required on Linux
- **Fast installation** (no compilation)

Installation typically completes in **10-30 seconds**.

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

Termly CLI supports **20+ interactive terminal-based AI coding assistants**:

### Official Tools from Major Companies
- **Claude Code** (Anthropic) - AI coding assistant
- **GitHub Copilot CLI** (Microsoft) - Command line AI
- **Cursor CLI** (Cursor) - AI coding assistant CLI
- **Cody CLI** (Sourcegraph) - AI assistant (Beta)
- **Amazon Q Developer** (AWS) - Free tier available
- **Google Gemini CLI** (Google) - 1M token context window
- **Grok CLI** (xAI) - X.AI's coding assistant
- **OpenAI Codex CLI** (OpenAI) - Code generation model

### Popular Open-Source Tools
- **Aider** - AI pair programming (35k+ stars)
- **Continue CLI** - Modular architecture
- **OpenHands** - Open-source Devin alternative
- **Mentat** - Git integration
- **ChatGPT CLI** - ChatGPT in terminal
- **ShellGPT** - Shell command assistant
- **Ollama** - Run LLMs locally (CodeLlama, etc)
- **Blackbox AI** - Debugging & file editing

### Experimental/Future Support
- **OpenCode** - When released
- **Devin CLI** - When released
- **Any other terminal-based AI tool**

**And more...** - Works with any terminal-based AI tool that supports interactive TTY mode

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

Quick list of active sessions with encryption fingerprints for verification.

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

- **Node.js 18+**
- **At least one AI coding assistant** installed (see Supported AI Tools section)
- **Mobile app** (iOS/Android) - coming soon

## Troubleshooting

### Installation Issues

**Installation usually works flawlessly** thanks to prebuilt binaries.

If you encounter issues:

**"Cannot find module 'node-pty'"**

Reinstall the package:
```bash
npm uninstall -g @termly-dev/cli
npm cache clean --force
npm install -g @termly-dev/cli
```

**Permission errors on macOS/Linux**

Use `sudo` or fix npm permissions:
```bash
# Option 1: Use sudo
sudo npm install -g @termly-dev/cli

# Option 2: Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g @termly-dev/cli
```

**Windows: "EPERM: operation not permitted"**

This is usually a warning, not a fatal error. Check if installation succeeded:
```cmd
termly --version
```

If the command works, installation was successful.

### Usage Issues

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
- **Fingerprint verification** - Compare encryption keys between CLI and mobile app
- **Zero-knowledge server** - Server cannot decrypt your data
- **One mobile device per session**
- **Environment isolation** - Production and development separated
- **Version enforcement** - Automatic check for minimum supported version
- **Open source** - Audit the code yourself

## Architecture

Termly CLI uses a PTY (pseudo-terminal) to spawn AI tools locally and streams I/O through WebSocket with end-to-end encryption.

```
Mobile App <--[encrypted]--> WebSocket Server <--[encrypted]--> CLI <--[local]--> PTY <--> AI Tool
```

**Key features:**
- **Circular buffer** - Stores last 100KB for session resume
- **Platform-specific optimizations** - Windows output deduplication and escape sequence normalization
- **Batch catchup** - Sends missed messages in 100-message batches with 10ms delay

For detailed architecture diagrams and data flow, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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

# View logs
tail -f ~/.termly/logs/cli.log  # macOS/Linux
Get-Content $env:USERPROFILE\.termly\logs\cli.log -Wait -Tail 50  # Windows
```

## Publishing

### Production Release

```bash
# Update version in package.json and package.dev.json
npm version patch  # or minor, or major

# Publish production package
npm publish
```

### Development Release

```bash
# Use the publish script
./scripts/publish-dev.sh

# Or manually:
cp package.dev.json package.json
npm publish
git checkout package.json
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Before contributing:**
- Read [CLAUDE.md](CLAUDE.md) for project structure and implementation details
- Check [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for architecture overview
- Run the CLI locally to test your changes

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Project overview and implementation guide for AI assistants
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Detailed architecture with data flow diagrams
- **[CRYPTO_SPEC.md](CRYPTO_SPEC.md)** - End-to-end encryption specification
- **[COMMUNICATION_PROTOCOL.md](COMMUNICATION_PROTOCOL.md)** - WebSocket protocol documentation
- **[WINDOWS_DEBUG.md](WINDOWS_DEBUG.md)** - Windows debugging instructions
- **[MIGRATION_TO_ESM.md](MIGRATION_TO_ESM.md)** - Future ESM migration plan

## License

MIT - See [LICENSE](LICENSE) for details

## Support

- **Issues:** https://github.com/termly-dev/termly-cli/issues
- **Discussions:** https://github.com/termly-dev/termly-cli/discussions
- **Website:** https://termly.dev
- **Documentation:** https://termly.dev/docs

## Links

- 🌐 Website: https://termly.dev
- 🔧 Development: https://dev.termly.dev
- 📚 Documentation: https://termly.dev/docs
- 💻 GitHub: https://github.com/termly-dev/termly-cli
- 🐛 Issues: https://github.com/termly-dev/termly-cli/issues
- ☕ Support us: https://ko-fi.com/termly

---

Made with ❤️ by the Termly Team
