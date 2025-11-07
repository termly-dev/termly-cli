# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Termly CLI is a universal NPM utility that enables remote terminal access to AI coding assistants (Claude Code, Aider, GitHub Copilot, Gemini, Grok, Cody, and 10+ more) from mobile devices. It works by:

1. Spawning AI tools in a PTY (pseudo-terminal) on the developer's computer
2. Streaming terminal I/O through WebSocket to a server with end-to-end encryption
3. Supporting session resume with circular buffering and sequence numbers
4. Managing multiple independent sessions simultaneously

**Key constraint:** Each CLI session supports exactly ONE mobile device connection.

## Multi-Environment Architecture

The CLI supports three environments with **hardcoded server URLs**:

- **Production** (`@termly-dev/cli`): `termly` command → `wss://api.termly.dev`
- **Development** (`@termly-dev/cli-dev`): `termly-dev` command → `wss://dev-api.termly.dev`
- **Local**: `TERMLY_ENV=local` → `ws://localhost:3000`

Environments are detected by:
1. `TERMLY_ENV=local` environment variable (highest priority)
2. Binary name (`cli-dev.js` = dev, `cli.js` = production)
3. Default to production

**Critical:** Users CANNOT change server URLs. They are immutable per environment.

## Development Commands

```bash
# Install dependencies
npm install

# Test production package
node bin/cli.js [command]
node bin/cli.js config  # Should show "Production" environment

# Test development package
node bin/cli-dev.js [command]
node bin/cli-dev.js config  # Should show "Development" environment

# Test local environment
TERMLY_ENV=local node bin/cli.js config  # Should show "Local Development"

# Link for global testing
npm link  # Creates 'termly' command

# Debug mode (enables verbose logging)
DEBUG=1 node bin/cli.js start --debug
node bin/cli.js start --debug

# View logs
tail -f ~/.termly/logs/cli.log

# Clean up test sessions
rm -rf ~/.termly
```

## Publishing

```bash
# Publish production package
npm publish

# Publish development package
cp package.dev.json package.json
npm publish
git checkout package.json  # Restore original
```

## Dependencies

### node-pty (Prebuilt Binaries)

The CLI uses **@lydell/node-pty** - a fork of the official node-pty that includes prebuilt binaries for all platforms. This eliminates the need for C++ build tools during installation.

**Supported platforms (no compilation required):**
- Windows 10+ (x64, ARM64) - uses ConPTY only
- macOS (Intel x64, Apple Silicon ARM64)
- Linux (x64, ARM64)

**Note:** Windows 7/8 are NOT supported as this fork only supports ConPTY (available from Windows 10 build 17763+).

**Package specification:**
```json
"node-pty": "npm:@lydell/node-pty@^1.1.0"
```

**Benefits:**
- ✅ No Visual Studio required on Windows
- ✅ No Xcode CLI tools required on macOS
- ✅ No build-essential required on Linux
- ✅ Fast installation (no compilation)
- ✅ Consistent binaries across all platforms

**Legacy note:** The `scripts/check-build-tools.js` file remains in the repository for historical reference but is no longer used in the installation process.

## Architecture

### Core Data Flow

**Installation Flow:**
1. User runs `npm install -g @termly-dev/cli` (or cli-dev)
2. npm installs all dependencies including @lydell/node-pty
3. @lydell/node-pty automatically selects the correct prebuilt binary for the platform (no compilation needed)
4. Installation completes in seconds without requiring any build tools

**Start Command Flow:**
1. `utils/version-checker.js` → checks CLI version against server minimum (blocks if outdated)
2. `start.js` → validates directory, checks for existing session
3. `ai-tools/selector.js` → auto-detects or selects AI tool
4. `crypto/dh.js` → generates DH keypair for E2EE
5. Generates pairing code (ABC123 format, displayed as ABC-123) + QR code
6. `session/registry.js` → registers session to `~/.termly/sessions.json`
7. `network/websocket.js` → connects to `wss://api.termly.dev/ws/agent?code=ABC123`
8. On pairing complete: computes shared secret → derives AES-256 key → generates fingerprint
9. `session/pty-manager.js` → spawns AI tool via node-pty
10. Bidirectional streaming begins:
   - PTY output → CircularBuffer → encrypt → WebSocket → mobile
   - Mobile input → WebSocket → decrypt → PTY

### Session State Management

**Sessions Registry (`~/.termly/sessions.json`):**
- Stores all session metadata (sessionId, PID, workingDir, aiTool, fingerprint, mobileConnected, etc.)
- Status values: `running`, `stopped`, `stale`
- Auto-validates PIDs on load (marks dead processes as `stale`)
- Prevents duplicate sessions per directory
- Fingerprint stored after encryption established for verification

**Circular Buffer:**
- Stores last 100KB of PTY output in memory
- Each message has sequence number for catchup
- Used for session resume when mobile reconnects
- Buffer eviction: FIFO when size > maxSize

### End-to-End Encryption

**Key Exchange:**
1. CLI generates DH-2048 keypair, sends public key to server
2. Mobile generates DH keypair, sends public key via server
3. Both sides compute shared secret: `DH(myPrivate, theirPublic)`
4. Derive AES-256 key: `HKDF-SHA256(sharedSecret, "termly-session-key")`

**Encryption:**
- Algorithm: AES-256-GCM (authenticated encryption)
- Each message encrypted with random 12-byte IV
- Format: `{ciphertext: base64(data + authTag), iv: base64}`
- Server cannot decrypt (zero-knowledge)

### Reconnection Logic

**WebSocket Reconnection:**
- Exponential backoff: 0s, 2s, 4s, 8s, then 16s (max 10 attempts)
- Managed by `network/reconnect.js`
- PTY continues running locally during reconnect

**Mobile Reconnection (Session Resume):**
1. Mobile sends `catchup_request` with `lastSeq` number
2. CLI retrieves `buffer.getAfter(lastSeq)` to get missed messages
3. Messages are split into batches of 100 and sent as `catchup_batch` messages
4. Each batch contains array of encrypted messages with original sequence numbers
5. 10ms delay between batches to prevent flooding
6. Sends `sync_complete` when all batches delivered

### AI Tool Detection

**Registry (`lib/ai-tools/registry.js`):**
- Defines all supported tools with `command`, `args`, `checkInstalled()`
- Tools: claude-code, aider, codex, github-copilot, gemini, grok, and 10+ more (see lib/ai-tools/registry.js)

**Auto-Detection (`lib/ai-tools/detector.js`):**
- Runs `command -v <tool>` for each registered tool
- Attempts version detection via `--version` or `-v`
- If multiple found: prompts user with inquirer
- If one found: auto-selects
- If none found: shows installation instructions

**Selection Logic:**
- `--ai <tool>` flag: manual selection (validates installed)
- `--no-auto-detect`: requires manual selection
- Default: auto-detect mode

## Configuration & Storage

**Config file:** `~/.termly/config.json` (managed by `conf` library v10.2.0)
- Schema: defaultAI, version, lastUpdated (serverUrl removed - now hardcoded per environment)
- Important: Use conf v10.x (v11+ is ESM-only, incompatible with CommonJS)

**Environment detection:** `lib/config/environment.js`
- Exports: getServerUrl(), getApiUrl(), getEnvironmentName(), isLocal(), isDev(), isProduction()
- Determines environment at runtime (cannot be changed by users)

**Sessions file:** `~/.termly/sessions.json`
- Array of session objects
- Auto-cleanup on `termly cleanup` command

**Logs:** `~/.termly/logs/cli.log`
- Never logs: encryption keys, user input, encrypted content
- Logs: connections, errors, session lifecycle, debug info
- Debug mode (`DEBUG=1` or `--debug` flag):
  - Shows verbose logging on console (WebSocket messages, catchup details, connection events)
  - `logger.debug()` - only shown in debug mode
  - `logger.debugInfo()` - written to file always, console only in debug mode
  - Mobile connect/disconnect messages hidden by default, shown only in debug mode

## Important Implementation Notes

### PTY Management
- PTY spawns AI tool command directly (not through shell wrapper)
- Uses xterm-256color terminal type
- Handles both local echo and remote transmission
- Terminal resize events forwarded from mobile via WebSocket

### Session Isolation
- Each session = independent process with own PID
- Sessions tracked by `workingDir` to prevent duplicates
- Kill signals: SIGTERM (5s timeout) → SIGKILL (force)
- Cleanup handlers on SIGINT/SIGTERM/process.exit

### WebSocket Protocol
Message types from mobile:
- `pairing_complete` → contains mobile's DH public key
- `client_connected` → mobile joined
- `client_disconnected` → mobile left
- `catchup_request` → mobile rejoined (sends lastSeq to start catchup)
- `input` → encrypted user input (decrypt → write to PTY)
- `resize` → terminal resize {cols, rows}
- `pong` → heartbeat response

Message types to mobile:
- `output` → encrypted PTY output with seq number
- `catchup_batch` → batch of missed messages during session resume (up to 100 messages per batch)
- `ping` → heartbeat (every 30s)
- `sync_complete` → catchup finished (all batches delivered)

### Pairing Code Format
- 6 chars: `[A-Z0-9]{6}` (e.g., ABC123)
- Generated randomly without dash
- Displayed with dash for readability: ABC-123 (formatting only)
- Included in QR code JSON: `{type, code, serverUrl, aiTool, projectName}`
- Sent to server at `/api/pairing` endpoint

### Error Handling Patterns
- **Outdated CLI version:** Block start with update command from server
- **AI tool not found:** Show installation instructions specific to tool
- **Session exists in dir:** Show session info + suggest `termly stop`
- **Network error:** Auto-reconnect with backoff (version check skipped on network error)
- **PTY crash:** Log exit code, update session status
- **Stale sessions:** Detected by PID check, removable via `cleanup`

## Special Considerations

**Chalk version:** Must use v4.x (v5+ is ESM-only)
**Conf version:** Must use v10.x (v11+ is ESM-only)
**Node version:** Requires 18+ (uses crypto.hkdfSync, native ESM support)

**node-pty (via @lydell/node-pty):**
- Uses prebuilt binaries for all platforms (Windows, macOS, Linux - both x64 and ARM64)
- No C++ build tools required for installation
- Windows: Requires Windows 10 build 17763+ (ConPTY only, WinPTY removed)
- Cannot be replaced - PTY is essential for interactive AI tool terminal emulation
- API compatible with official node-pty 1.1.0

**Testing without server:**
The implementation includes WebSocket client code but the actual server (api.termly.dev) is not implemented. For testing, the `start` command will generate pairing code and QR but won't complete the WebSocket handshake.

**Adding new AI tools:**
Edit `lib/ai-tools/registry.js`:
```javascript
'tool-name': {
  key: 'tool-name',
  command: 'command-to-run',
  args: ['default', 'args'],
  displayName: 'Tool Display Name',
  description: 'Description',
  website: 'https://tool.website',
  checkInstalled: async () => await commandExists('command-to-run')
}
```

## Files to Check When...

**Adding a new command:** `bin/cli.js` (register command) + `lib/commands/<name>.js` (implementation)

**Modifying encryption:** `lib/crypto/dh.js` (key exchange) + `lib/crypto/aes.js` (encryption)

**Changing session logic:** `lib/session/registry.js` (persistence) + `lib/session/state.js` (runtime state)

**Debugging WebSocket issues:** `lib/network/websocket.js` (protocol) + `lib/network/reconnect.js` (backoff)

**PTY problems:** `lib/session/pty-manager.js` (spawning/IO) + `lib/session/buffer.js` (buffering)

**Configuration changes:** `lib/config/manager.js` (schema must match conf requirements)

**Environment changes:** `lib/config/environment.js` (add new environments or modify URLs here)

**Version checking:** `lib/utils/version-checker.js` (CLI version validation logic)

**New environment setup:** Edit `lib/config/environment.js` ENVIRONMENTS object, then create corresponding package file (e.g., `package.staging.json`) and binary (`bin/cli-staging.js`)
