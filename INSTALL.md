# Termly CLI - Installation Guide

## For Developers

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- At least one AI coding assistant installed (Claude Code, Aider, etc.)

### Installation from Source

1. Clone the repository:
```bash
git clone https://github.com/termly-dev/termly-cli.git
cd termly-cli
```

2. Install dependencies:
```bash
npm install
```

3. Link for local development:
```bash
npm link
```

Now you can use `termly` command globally.

### Development

```bash
# Run directly without linking
node bin/cli.js --help

# Debug mode
DEBUG=1 node bin/cli.js start --debug

# Test specific command
node bin/cli.js tools list
node bin/cli.js status
```

### Testing

```bash
# Check if CLI works
termly --version
termly --help

# Test AI tool detection
termly tools list
termly tools detect

# Test configuration
termly config
termly setup

# View active sessions
termly status
termly list
```

### Publishing to NPM (for maintainers)

1. Update version in package.json:
```bash
npm version patch|minor|major
```

2. Publish to npm:
```bash
npm publish
```

3. Users can then install globally:
```bash
npm install -g termly-cli
```

## For End Users

### Via NPM (Recommended)

```bash
npm install -g termly-cli
```

### Via Install Script

```bash
curl -fsSL https://get.termly.dev | bash
```

### Via Homebrew (Future)

```bash
brew install termly
```

## Post-Installation

1. Verify installation:
```bash
termly --version
```

2. Run setup:
```bash
termly setup
```

3. Check which AI tools are detected:
```bash
termly tools list
```

4. Start your first session:
```bash
cd your-project
termly start
```

## Troubleshooting

### Command not found

If `termly` command is not found after installation:

**NPM Global Install:**
```bash
# Check npm global bin path
npm config get prefix

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$(npm config get prefix)/bin"
```

**NPM Link:**
```bash
# Relink
npm unlink
npm link
```

### Permission Errors

If you get permission errors during npm install:

```bash
# Don't use sudo! Instead, fix npm permissions:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Then install again
npm install -g termly-cli
```

### Node Version

Ensure you have Node.js 18 or higher:

```bash
node --version
```

If you need to upgrade:
- Using nvm: `nvm install 18 && nvm use 18`
- Download from https://nodejs.org

## Uninstallation

### NPM Global Install

```bash
npm uninstall -g termly-cli
```

### NPM Link

```bash
npm unlink
```

### Clean Up Config Files

```bash
rm -rf ~/.termly
```

This will remove all configuration, sessions, and logs.
