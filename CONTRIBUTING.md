# Contributing to Termly CLI

Thank you for your interest in contributing to Termly CLI! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Adding AI Tool Support](#adding-ai-tool-support)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project follows a simple code of conduct: **be respectful and constructive**. We're all here to make Termly better.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/termly-cli.git
   cd termly-cli
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/termly-dev/termly-cli.git
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

## Development Setup

### Project Structure

Read [CLAUDE.md](CLAUDE.md) for a complete overview of the project structure and architecture.

Key directories:
- `bin/` - CLI entry points
- `lib/commands/` - Command implementations
- `lib/session/` - Session and PTY management
- `lib/network/` - WebSocket and reconnection logic
- `lib/crypto/` - End-to-end encryption
- `lib/ai-tools/` - AI tool registry and detection
- `docs/` - Architecture documentation

### Running Locally

```bash
# Run production mode
node bin/cli.js start

# Run development mode (connects to dev server)
node bin/cli-dev.js start

# Run with local server
TERMLY_ENV=local node bin/cli.js start

# Enable debug logging
DEBUG=1 node bin/cli.js start --debug
```

### Viewing Logs

```bash
# macOS/Linux
tail -f ~/.termly/logs/cli.log

# Windows
Get-Content $env:USERPROFILE\.termly\logs\cli.log -Wait -Tail 50
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-ollama-support` - New features
- `fix/windows-path-issue` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/session-manager` - Code refactoring

### Commit Messages

Write clear, descriptive commit messages:

```
Fix Windows PATH issue - add npm global bin to PTY environment

- Add npm global bin paths to Windows PTY environment
- Handle both npm prefix and global bin directory
- Fixes #123
```

**Format:**
- First line: Brief summary (50-72 chars)
- Blank line
- Detailed explanation (if needed)
- Reference issues with `Fixes #123` or `Closes #123`

### Code Style

- Use **CommonJS** (`require`/`module.exports`) - ESM migration planned for v2.0
- Follow existing code patterns
- Add comments for complex logic
- Keep functions focused and testable
- Use descriptive variable names

## Testing

### Manual Testing

Before submitting a PR, test your changes:

1. **Test on your platform:**
   ```bash
   node bin/cli.js start --debug
   ```

2. **Test with multiple AI tools** (if applicable)

3. **Test session management:**
   ```bash
   node bin/cli.js status
   node bin/cli.js list
   node bin/cli.js stop [session-id]
   ```

4. **Check for errors in logs:**
   ```bash
   cat ~/.termly/logs/cli.log
   ```

### Cross-Platform Testing

If possible, test on multiple platforms:
- macOS (Intel and Apple Silicon)
- Linux (Ubuntu, Fedora, etc.)
- Windows (PowerShell and CMD)

Don't worry if you can't test everywhere - we'll help with CI/CD.

### AI Tool Testing

If adding AI tool support, verify:
- Tool installs correctly
- Tool runs interactively in terminal
- Tool works with Termly CLI
- Auto-detection finds the tool
- Manual selection works (`--ai <tool>`)

## Submitting a Pull Request

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "Add my feature"
   ```

3. **Keep your branch updated:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

4. **Push to your fork:**
   ```bash
   git push origin feature/my-feature
   ```

5. **Open a Pull Request** on GitHub

6. **Fill out the PR template** completely

7. **Respond to review feedback** promptly

### PR Review Process

- Maintainers will review your PR
- You may be asked to make changes
- Once approved, your PR will be merged
- Your contribution will be credited in the release notes

## Adding AI Tool Support

Want to add support for a new AI tool? Great!

### Requirements

The AI tool must:
- Run interactively in a terminal (stdin/stdout)
- Support PTY/TTY mode
- Be installable via standard package managers
- Have a stable CLI interface

### Steps

1. **Test the tool manually:**
   ```bash
   # Example: testing a new tool
   mytool --interactive
   ```

2. **Add to registry** (`lib/ai-tools/registry.js`):
   ```javascript
   'mytool': {
     key: 'mytool',
     command: 'mytool',
     args: ['--interactive'],
     displayName: 'MyTool',
     description: 'Description of the tool',
     website: 'https://mytool.dev',
     checkInstalled: async () => await commandExists('mytool')
   }
   ```

3. **Test detection:**
   ```bash
   node bin/cli.js tools detect
   node bin/cli.js start --ai mytool
   ```

4. **Update documentation:**
   - Add to README.md "Supported AI Tools" section
   - Update CLAUDE.md if needed

5. **Submit PR** with:
   - Registry changes
   - Documentation updates
   - Screenshots of tool working

## Documentation

### Updating Documentation

If your changes affect:

- **User-facing features:** Update [README.md](README.md)
- **Implementation details:** Update [CLAUDE.md](CLAUDE.md)
- **Architecture:** Update [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Protocol changes:** Update [COMMUNICATION_PROTOCOL.md](COMMUNICATION_PROTOCOL.md)
- **Crypto changes:** Update [CRYPTO_SPEC.md](CRYPTO_SPEC.md)

### Writing Documentation

- Be clear and concise
- Include code examples
- Add screenshots when helpful
- Test your instructions

## Community

### Getting Help

- **GitHub Discussions:** https://github.com/termly-dev/termly-cli/discussions
- **Issues:** https://github.com/termly-dev/termly-cli/issues
- **Documentation:** https://termly.dev/docs

### Reporting Issues

Before reporting:
1. Check existing issues
2. Try the latest version
3. Collect relevant information (OS, Node.js version, logs)

Use issue templates:
- Bug Report
- Feature Request
- AI Tool Support Request

### Suggesting Features

We love feature suggestions! Use the "Feature Request" template and include:
- Clear description
- Use case
- Proposed solution
- Any implementation ideas

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes
- README.md (for significant contributions)

## Questions?

Feel free to ask questions in:
- GitHub Discussions
- Issue comments
- Pull request comments

We're here to help!

---

**Thank you for contributing to Termly CLI!** 🎉

Every contribution, no matter how small, makes a difference.
