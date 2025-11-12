# Changelog

All notable changes to Termly CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-01-12

### Changed
- **BREAKING:** Switched to @lydell/node-pty with prebuilt binaries for all platforms
- Removed build tools requirement - installation now works out-of-the-box on all platforms
- Simplified installation process - no Visual Studio, Xcode, or build-essential needed

### Fixed
- Windows: Always add npm bin to PATH environment
- Windows: Fix PATH issue by adding npm global bin to PTY environment
- Windows: Add .cmd extension when missing for command execution
- Windows: Fix .cmd/.bat file execution by spawning directly without cmd.exe
- Windows: Fix command escaping by passing full command as single string
- Windows: Fix PTY path quoting for full paths
- Windows: Fix Claude Code execution with two critical bug fixes

### Improved
- Installation speed improved from minutes to 10-30 seconds
- Better Windows terminal support and stability
- Reverted ConPTY flickering fix that broke mobile layout

## [1.2.0] - 2024-12-XX

### Added
- Windows output deduplication using hash-based sliding window
- Separate data streams for PowerShell vs Mobile normalization
- Detailed catchup diagnostics for debugging

### Fixed
- Windows screen accumulation by normalizing escape sequences
- Windows duplicate output issue with SHA256-based deduplication
- PowerShell rendering issues on Windows

### Improved
- Windows terminal performance and reliability
- Mobile display rendering on Windows

## [1.1.x] - 2024-11-XX

### Added
- Windows deduplication with configurable threshold
- Detailed debug logging for Windows vs Mac comparison
- Improved Windows PTY spawn handling

### Fixed
- Windows .cmd/.bat file execution issue
- Windows version detection
- AI tool detection on Windows
- Windows duplicate output with hash-based deduplication

## [1.0.0] - 2024-11-XX

### Added
- **Stable release!**
- Catchup logs moved to debug mode
- Connection and resize messages hidden from console by default
- Start command made default for simplified CLI usage

### Changed
- Default command is now `start` (just run `termly` in project directory)
- Debug messages only log when DEBUG mode is enabled

### Improved
- User experience with cleaner console output
- Documentation updates

## [0.9.x] - 2024-10-XX

### Added
- Intelligent terminal resize management
- Improved heartbeat monitoring and reconnection handling
- Animated spinner for WebSocket reconnection UI
- Support for GitHub Copilot and Cursor CLI tools

### Fixed
- AI tool CLI commands for GitHub Copilot and Cursor
- Terminal resize handling improvements

### Improved
- WebSocket reconnection reliability
- User feedback during reconnection

## [0.8.x] - 2024-10-XX

### Added
- Demo mode for Apple App Review testing
- Enhanced demo logo with colors and animation
- Split-screen layout in demo mode
- UTF-8 support in demo mode

### Fixed
- Cursor visibility in demo mode
- Input handling in demo mode
- Mobile connection system message filtering

### Changed
- Demo mode excluded from auto-detection and tools list
- Improved demo screen redraw on mobile device connection

### Improved
- Text wrapping for long messages in demo mode
- Footer animation and clearing to prevent artifacts

## [0.7.x] - 2024-09-XX

### Added
- ESM migration plan documentation (MIGRATION_TO_ESM.md)
- node-pty updated to 1.1.0-beta37 for MSVC 2022 compatibility

### Fixed
- Windows build tools detection using vswhere (like node-gyp)

### Improved
- Build tools detection accuracy on Windows

## Earlier Versions

See git history for detailed changes in earlier versions.

## Version Support

**We only support the latest version.** Termly CLI includes automatic version enforcement - outdated versions will be blocked from connecting if they have security issues.

| Version | Status | Support |
|---------|--------|---------|
| Latest (1.3.x) | ✅ Supported | Full support |
| Older versions | ❌ Unsupported | Update required |

To update:
```bash
npm update -g @termly-dev/cli
```

## Upgrade Guide

### From 1.2.x to 1.3.0

No breaking changes for users. Simply update:

```bash
npm update -g @termly-dev/cli
```

**Note:** If you had build tools installed for previous versions, you can now uninstall them if not needed for other projects.

### From 1.x to 1.3.0

No configuration changes required. Just update the package.

### From 0.x to 1.x

Version 1.0 introduced stability improvements but no breaking API changes.

---

For detailed commit history, see: https://github.com/termly-dev/termly-cli/commits/main
