# CLAUDE.md

Termly CLI: npm utility that spawns AI coding tools (Claude Code, Aider, Codex, Gemini, ... see `lib/ai-tools/registry.js`) in a PTY and streams terminal I/O over WebSocket, end-to-end encrypted, to a mobile app. Each CLI session supports exactly ONE mobile device. CommonJS, Node 18+.

## Environments
Server URLs are hardcoded per environment (`lib/config/environment.js`) and users cannot change them.
- Production (`@termly-dev/cli`, `termly`, `bin/cli.js`): `wss://api.termly.dev`
- Development (`@termly-dev/cli-dev`, `termly-dev`, `bin/cli-dev.js`): `wss://dev-api.termly.dev`
- Local: `TERMLY_ENV=local` (highest priority): `ws://localhost:3000`

## Commands
```bash
npm install
node bin/cli.js config                 # shows active environment
TERMLY_ENV=local node bin/cli.js start --debug
DEBUG=1 node bin/cli.js start          # verbose console logging
tail -f ~/.termly/logs/cli.log
npm link                               # global `termly`
```
No test suite (`npm test` is a stub).

Publish: `npm publish` for prod. Dev package: `scripts/publish-dev.sh` (swaps in `package.dev.json`; restore `package.json` afterwards). `package.json` and `package.dev.json` must stay in sync (dependencies, version).

## Gotchas
- Pin `chalk` to v4 and `conf` to v10 (v5+/v11+ are ESM-only; this is CommonJS).
- `node-pty` is `npm:@lydell/node-pty` (prebuilt binaries, ConPTY only, so Windows 10 build 17763+). `scripts/check-build-tools.js` is legacy and unused.
- All numeric constants go in `lib/config/constants.js`; do not hardcode them elsewhere.
- Logs never contain encryption keys, user input or encrypted content.
- The PTY spawns the tool directly (no shell wrapper), `xterm-256color`.

## Architecture
Start flow: `utils/version-checker.js` (blocks if CLI older than server minimum) -> `commands/start.js` (validate dir, one session per `workingDir`) -> `ai-tools/selector.js` / `detector.js` (`--ai <tool>`, `--no-auto-detect`, else detect via `command -v`) -> `crypto/dh.js` -> pairing code registered via `POST /api/pairing` -> `session/registry.js` (`~/.termly/sessions.json`; PIDs validated on load, dead ones become `stale`) -> `network/websocket.js` (`/ws/agent?code=...`, `?sessionId=...` on reconnect) -> `session/pty-manager.js`.

Pairing code: 6 chars `[A-Z0-9]`, shown as `ABC-123`, sent without the dash.

Encryption: DH group `modp14` (RFC 3526, 2048-bit) -> `HKDF-SHA256(secret, info="termly-session-key")` -> AES-256-GCM, random 12-byte IV, `{ciphertext: base64(data+authTag), iv}`. The info string must match the iOS app. Server cannot decrypt.

Reconnect: WebSocket backoff is 0s, 2s, 4s, then 8s for the rest, max 10 attempts (`network/reconnect.js`); the PTY keeps running. Heartbeat timeout 13s (server pings roughly every 5s); CLI replies `pong` with `status: idle|busy` (busy = PTY output within 15s, drives push notifications).

Session resume: `CircularBuffer` keeps the last 100KB of output with sequence numbers. Mobile sends `catchup_request {lastSeq}`; CLI replies with `catchup_batch` messages of up to 100 (10ms apart), then `sync_complete`.

TUI mode: tools in `this.tuiTools` in `lib/session/pty-manager.js` (currently `opencode`, `kilo`) skip buffer writes (no catchup) and clear the screen on mobile connect.

Message types: from mobile `pairing_complete`, `client_connected`, `client_disconnected`, `catchup_request`, `input`, `resize`; to mobile `output`, `catchup_batch`, `ping`, `sync_complete`; to server `pong`.

Stop: SIGTERM, then SIGKILL after 5s.

## Where to change things
- New command: register in `bin/cli.js`, implement in `lib/commands/<name>.js`
- New AI tool: add an entry (`key`, `command`, `args`, `displayName`, `description`, `website`, `checkInstalled`) to `lib/ai-tools/registry.js`
- New environment: edit `ENVIRONMENTS` in `lib/config/environment.js`, add `package.<env>.json` and `bin/cli-<env>.js`
- Config schema: `lib/config/manager.js` (`~/.termly/config.json`: defaultAI, version, lastUpdated)
