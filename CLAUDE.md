# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Termly CLI is a universal NPM utility that enables remote terminal access to AI coding assistants (Claude Code, Aider, GitHub Copilot, Cursor, Cody, etc.) from mobile devices. It works by:

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

## Architecture

### Core Data Flow

**Start Command Flow:**
1. `start.js` → validates directory, checks for existing session
2. `ai-tools/selector.js` → auto-detects or selects AI tool
3. `crypto/dh.js` → generates DH keypair for E2EE
4. Generates pairing code (ABC-123 format) + QR code
5. `session/registry.js` → registers session to `~/.termly/sessions.json`
6. `network/websocket.js` → connects to `wss://api.termly.dev/ws/agent?code=ABC123`
7. On pairing complete: computes shared secret → derives AES-256 key
8. `session/pty-manager.js` → spawns AI tool via node-pty
9. Bidirectional streaming begins:
   - PTY output → CircularBuffer → encrypt → WebSocket → mobile
   - Mobile input → WebSocket → decrypt → PTY

### Session State Management

**Sessions Registry (`~/.termly/sessions.json`):**
- Stores all session metadata (sessionId, PID, workingDir, aiTool, etc.)
- Status values: `running`, `stopped`, `stale`
- Auto-validates PIDs on load (marks dead processes as `stale`)
- Prevents duplicate sessions per directory

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
1. Mobile sends `client_reconnected` with `lastSeq` number
2. CLI retrieves `buffer.getAfter(lastSeq)`
3. Sends all missed messages with original sequence numbers
4. Sends `sync_complete` when catchup done

### AI Tool Detection

**Registry (`lib/ai-tools/registry.js`):**
- Defines all supported tools with `command`, `args`, `checkInstalled()`
- Tools: claude-code, aider, github-copilot, cursor, cody

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
- `client_reconnected` → mobile rejoined (sends lastSeq)
- `input` → encrypted user input (decrypt → write to PTY)
- `resize` → terminal resize {cols, rows}
- `pong` → heartbeat response

Message types to mobile:
- `output` → encrypted PTY output with seq number
- `ping` → heartbeat (every 30s)
- `sync_complete` → catchup finished

### Pairing Code Format
- 6 chars: `[A-Z0-9]{3}-[A-Z0-9]{3}` (e.g., ABC-123)
- Generated randomly
- Included in QR code JSON: `{type, code, serverUrl, aiTool, projectName}`
- Sent to server at `/api/pairing` endpoint

### Error Handling Patterns
- AI tool not found: Show installation instructions specific to tool
- Session exists in dir: Show session info + suggest `termly stop`
- Network error: Auto-reconnect with backoff
- PTY crash: Log exit code, update session status
- Stale sessions: Detected by PID check, removable via `cleanup`

## Special Considerations

**Chalk version:** Must use v4.x (v5+ is ESM-only)
**Conf version:** Must use v10.x (v11+ is ESM-only)
**Node version:** Requires 18+ (uses crypto.hkdfSync, native ESM support)

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

**New environment setup:** Edit `lib/config/environment.js` ENVIRONMENTS object, then create corresponding package file (e.g., `package.staging.json`) and binary (`bin/cli-staging.js`)
