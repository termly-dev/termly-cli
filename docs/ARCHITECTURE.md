# Termly CLI Architecture: Data Flow

## Overview

Termly CLI connects AI coding tools (Claude Code, Aider, etc.) to mobile devices through WebSocket with E2EE.

```
Mobile <--> WebSocket Server <--> CLI <--> PTY <--> AI Tool
        (encrypted)               (local)
```

---

## Data Flow: Input (Mobile → AI Tool)

User types on mobile → receives by AI tool in terminal.

```
┌─────────────┐
│   Mobile    │ User types: "ls\n"
└──────┬──────┘
       │ WebSocket (encrypted: AES-256-GCM)
       ▼
┌──────────────────────────────────────┐
│ lib/network/websocket.js             │
│                                      │
│ handleInput(message)                 │
│   decrypted = decrypt(data, iv, key) │
└──────┬───────────────────────────────┘
       │ onInputCallback(decrypted)
       ▼
┌──────────────────────────────────────┐
│ lib/session/pty-manager.js           │
│                                      │
│ write(data)                          │
│   ptyProcess.write(data)             │
└──────┬───────────────────────────────┘
       │ stdin
       ▼
┌──────────────────────────────────────┐
│ PTY Process                          │
│ (Claude Code / Aider / etc.)         │
│                                      │
│ Receives: "ls\n"                     │
└──────────────────────────────────────┘
```

**No modifications - input passes as-is!**

---

## Data Flow: Output (AI Tool → PowerShell + Mobile)

AI tool generates output → splits into two destinations.

```
┌──────────────────────────────────────┐
│ PTY Process (Claude Code)           │
│                                      │
│ Generates: "Hello World\r\n"         │
└──────┬───────────────────────────────┘
       │ ptyProcess.on('data')
       ▼
┌──────────────────────────────────────────────────────────┐
│ lib/session/pty-manager.js :: handlePTYOutput(data)     │
│                                                          │
│ STEP 1: Filter bracketed paste (all platforms)          │
│ ─────────────────────────────────────────────────       │
│ filtered = data.replace(/\x1b\[I/g, '')  // Focus in    │
│                .replace(/\x1b\[O/g, '')  // Focus out   │
│                                                          │
│ STEP 2: Deduplicate (Windows only) 🔧                   │
│ ──────────────────────────────────────                  │
│ if (Windows) {                                          │
│   hash = SHA256(filtered)                               │
│   if (hash in recentOutputs[150ms window]) {            │
│     return;  // STOP - skip BOTH PowerShell and mobile  │
│   }                                                      │
│   recentOutputs.push({hash, timestamp})                 │
│ }                                                        │
│                                                          │
│ STEP 3: Split output into two streams                   │
│ ──────────────────────────────────────────              │
│                                                          │
│ 3a) Local PowerShell (original data)                    │
│     stdout.write(filtered)                              │
│                                                          │
│ 3b) Mobile (with Windows normalization)                 │
│     forMobile = filtered                                │
│     if (Windows && forMobile.startsWith('\x1b[H\x1b[K')){ │
│       forMobile = '\x1b[2J\x1b[3J\x1b[H' + rest         │
│     }                                                    │
│     buffer.append(forMobile)                            │
│     onDataCallback(forMobile)                           │
│                                                          │
└──┬─────────────────────────────────────┬─────────────────┘
   │                                     │
   │                                     │
   ▼                                     ▼
┌─────────────────┐          ┌─────────────────────────┐
│  Local stdout   │          │ lib/network/websocket.js│
│  (PowerShell)   │          │                         │
│                 │          │ sendOutput(data)        │
│ Original data   │          │   encrypted = encrypt() │
│ \x1b[H\x1b[K... │          │   ws.send({type, data}) │
└─────────────────┘          └──────┬──────────────────┘
                                    │ WebSocket
                                    ▼
                          ┌─────────────────────┐
                          │ WebSocket Server    │
                          └──────┬──────────────┘
                                 │
                                 ▼
                          ┌─────────────────────┐
                          │   Mobile App        │
                          │                     │
                          │ Normalized data     │
                          │ \x1b[2J\x1b[3J...   │
                          └─────────────────────┘
```

---

## Windows Optimizations (v1.1.10)

### Problem 1: Duplicate Output
**Cause:** cmd.exe generates duplicate PTY events within ~150ms
**Solution:** Hash-based sliding window deduplication
**Location:** `lib/session/pty-manager.js:152-188`
**Effect:** Blocks output to BOTH PowerShell and mobile if duplicate

```javascript
if (os.platform() === 'win32') {
  const hash = crypto.createHash('sha256').update(filtered).digest('hex');
  const duplicate = this.recentOutputs.find(e => e.hash === hash);
  if (duplicate && (now - duplicate.timestamp < 150)) {
    return; // Skip both destinations
  }
  this.recentOutputs.push({ hash, timestamp: now });
}
```

### Problem 2: Screen Accumulation on Mobile
**Cause:** Windows uses `\x1b[H\x1b[K` (home+clear line), Mac uses `\x1b[2J\x1b[3J\x1b[H` (clear screen)
**Solution:** Normalize Windows escape codes for mobile only
**Location:** `lib/session/pty-manager.js:199-209`
**Effect:** Mobile renders correctly, PowerShell gets original codes

```javascript
// PowerShell: gets original
stdout.write(filtered);  // "\x1b[H\x1b[K..."

// Mobile: gets normalized
let forMobile = filtered;
if (os.platform() === 'win32' && forMobile.startsWith('\x1b[H\x1b[K')) {
  forMobile = '\x1b[2J\x1b[3J\x1b[H' + forMobile.slice(6);
}
onDataCallback(forMobile);  // "\x1b[2J\x1b[3J\x1b[H..."
```

---

## Session Resume (Catchup)

When mobile reconnects after disconnect, CLI sends missed messages.

```
Mobile reconnects
    │
    ▼
ws.send({ type: 'catchup_request', lastSeq: 42 })
    │
    ▼
┌──────────────────────────────────────────────┐
│ lib/network/websocket.js                     │
│                                              │
│ handleCatchupRequest(message)                │
│   missedMessages = buffer.getAfter(42)       │
│   batches = chunk(missedMessages, 100)       │
│                                              │
│   for each batch:                            │
│     ws.send({                                │
│       type: 'catchup_batch',                 │
│       messages: batch                        │
│     })                                        │
│     await delay(10ms)                        │
│                                              │
│   ws.send({ type: 'sync_complete' })         │
└──────────────────────────────────────────────┘
```

**CircularBuffer:** Stores last 100KB of output with sequence numbers for catchup.

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/commands/start.js` | Entry point, session initialization |
| `lib/session/pty-manager.js` | PTY lifecycle, output processing, Windows optimizations |
| `lib/network/websocket.js` | WebSocket connection, encryption, catchup |
| `lib/session/buffer.js` | CircularBuffer for session resume |
| `lib/crypto/aes.js` | AES-256-GCM encryption |
| `lib/crypto/dh.js` | Diffie-Hellman key exchange |

---

## Debug Mode

Enable detailed logging:

```bash
# Windows PowerShell
node bin/cli.js start --debug

# Mac/Linux
DEBUG=1 node bin/cli.js start --debug
```

View logs:
```bash
# Windows
Get-Content $env:USERPROFILE\.termly\logs\cli.log -Wait -Tail 50

# Mac/Linux
tail -f ~/.termly/logs/cli.log
```

Debug output shows:
- Raw PTY output (hex + escaped text)
- Deduplication checks (hash, timestamp)
- Normalization events
- WebSocket messages
- Catchup details

---

## Summary

- **Input flow:** Mobile → decrypt → PTY (no modifications)
- **Output flow:** PTY → filter → dedup → split into two:
  - PowerShell: original data
  - Mobile: normalized data (Windows only)
- **Windows optimizations:**
  - Deduplication: prevents cmd.exe duplicate output bug
  - Normalization: fixes screen clear for mobile rendering
- **Session resume:** CircularBuffer stores last 100KB for catchup
