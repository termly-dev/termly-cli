# Termly CLI Communication Protocol

This document describes the complete communication protocol implementation for the Termly CLI agent. It is based on the e2e tests and protocol documentation from the termly-be backend project.

## Table of Contents

1. [Overview](#overview)
2. [Connection Flow](#connection-flow)
3. [Message Types](#message-types)
4. [Critical Implementation Details](#critical-implementation-details)
5. [Sequence Number Management](#sequence-number-management)
6. [Reconnection and Catchup Protocol](#reconnection-and-catchup-protocol)
7. [Heartbeat Protocol](#heartbeat-protocol)
8. [Best Practices](#best-practices)

---

## Overview

### Architecture
- **Zero-Knowledge E2EE**: Server acts as a relay and never decrypts message content
- **WebSocket Communication**: Real-time bidirectional messaging via WebSocket
- **Session-based**: Each CLI agent creates a unique session
- **Public Key Exchange**: Diffie-Hellman 2048-bit key exchange for E2EE setup
- **AES-256-GCM Encryption**: All terminal data encrypted end-to-end

### Key Principles
1. Server is a **relay only** - it forwards encrypted messages without decryption
2. CLI maintains **monotonically increasing sequence numbers** starting from 1
3. Mobile reconnection triggers **catchup protocol** to deliver missed messages
4. Messages must be sent **one-by-one with delays** during catchup (production pattern)
5. Server sends **ping**, CLI responds with **pong** (not the other way around)

---

## Connection Flow

### 1. Generate and Register Pairing Code

```javascript
// Generate pairing code (ABC-123 format)
const pairingCode = generatePairingCode(); // e.g., "XYZ-789"

// Generate DH keypair
const { dh, publicKey, privateKey } = generateDHKeyPair();

// Register pairing code via REST API
POST /api/pairing
Headers: X-API-Type: cli
Body: {
  code: "XYZ-789",
  publicKey: "base64-encoded-dh-public-key",
  projectName: "my-project",
  workingDir: "/path/to/project",
  computerName: "MacBook Pro",
  aiTool: "claude-code",
  aiToolVersion: "2.0.0"
}
```

### 2. Connect to WebSocket

```javascript
const serverUrl = getServerUrl(); // e.g., wss://api.termly.dev
const wsUrl = `${serverUrl}/ws/agent?code=${pairingCode}`;
const ws = new WebSocket(wsUrl);
```

**Important**: The WebSocket connection details:
- Path: `/ws/agent` - identifies this connection as a CLI agent
- Query parameter `code=ABC123` - the pairing code for session identification

### 3. Wait for Pairing Complete

When mobile device completes pairing, CLI receives:

```json
{
  "type": "pairing_complete",
  "sessionId": "uuid-v4-session-id",
  "mobilePublicKey": "base64-encoded-mobile-dh-public-key"
}
```

**Action Required**:
1. Compute shared secret: `sharedSecret = DH(yourPrivateKey, mobilePublicKey)`
2. Derive AES-256 key: `aesKey = HKDF-SHA256(sharedSecret, "termly-session-key")`
3. Store `sessionId` and `aesKey` for encryption
4. Start PTY process (AI tool)

### 4. Mobile Connection Notifications

**When mobile connects:**
```json
{
  "type": "client_connected",
  "timestamp": "2025-10-19T10:00:00.000Z"
}
```

**Action**: Set `mobileConnected = true`, start sending PTY output

**When mobile disconnects:**
```json
{
  "type": "client_disconnected",
  "timestamp": "2025-10-19T10:00:00.000Z"
}
```

**Action**: Set `mobileConnected = false`, continue buffering messages locally

---

## Message Types

### 1. Sending Terminal Output (CLI → Mobile)

**Message Type**: `output`

```javascript
// Encrypt terminal output
const encrypted = encrypt(data, aesKey);

// Send to mobile via WebSocket
ws.send(JSON.stringify({
  type: 'output',
  sessionId: sessionId,
  seq: currentSeq,           // Incrementing sequence number (1, 2, 3, ...)
  encrypted: true,
  data: encrypted.ciphertext, // Base64-encoded encrypted data
  iv: encrypted.iv,           // Base64-encoded initialization vector
  timestamp: new Date().toISOString()
}));
```

**Critical Points**:
- **Sequence numbers start at 1** (not 0)
- **Increment seq for every message** sent
- **Generate new random IV** for each encryption
- **Use ISO 8601 timestamp format** (not Unix milliseconds)
- Only send when `mobileConnected === true`

### 2. Receiving User Input (Mobile → CLI)

**Message Type**: `input`

```json
{
  "type": "input",
  "sessionId": "uuid-v4",
  "encrypted": true,
  "data": "base64-encrypted-user-input",
  "iv": "base64-iv",
  "timestamp": "2025-10-19T10:00:00.000Z"
}
```

**Action**:
1. Decrypt: `decrypted = decrypt(message.data, message.iv, aesKey)`
2. Write to PTY: `ptyProcess.write(decrypted)`

### 3. Receiving Terminal Resize Events (Mobile → CLI)

**Message Type**: `resize`

```json
{
  "type": "resize",
  "sessionId": "uuid-v4",
  "cols": 80,
  "rows": 24,
  "timestamp": "2025-10-19T10:00:00.000Z"
}
```

**Action**: Resize PTY to match mobile screen dimensions
```javascript
ptyProcess.resize(message.cols, message.rows);
```

### 4. Heartbeat: Ping from Server

**Message Type**: `ping`

```json
{
  "type": "ping"
}
```

**Action**: Respond immediately with pong
```javascript
ws.send(JSON.stringify({
  type: 'pong',
  timestamp: new Date().toISOString()
}));
```

**Timing**: Server sends ping every 30 seconds. CLI must respond to keep connection alive.

---

## Critical Implementation Details

### Sequence Number Management

**Rules**:
1. Start sequence counter at **0** initially
2. **Pre-increment** when appending to buffer: `seq = ++currentSeq`
3. First message has `seq = 1`, second has `seq = 2`, etc.
4. Never reset or reuse sequence numbers during session lifetime
5. `getCurrentSeq()` should return the **last assigned seq** (not seq-1)

**Implementation**:
```javascript
class CircularBuffer {
  constructor(maxSize = 100000) {
    this.currentSeq = 0; // Start at 0
  }

  append(data) {
    const seq = ++this.currentSeq; // Pre-increment: first seq is 1
    const timestamp = new Date().toISOString();

    const item = { seq, data, timestamp, size: byteSize };
    this.buffer.push(item);
    return item;
  }

  getCurrentSeq() {
    return this.currentSeq; // Return current seq (NOT currentSeq - 1)
  }
}
```

### Timestamp Format

**Always use ISO 8601 string format**, not Unix milliseconds:

```javascript
// ✅ CORRECT
timestamp: new Date().toISOString()
// Example: "2025-10-19T10:30:45.123Z"

// ❌ WRONG
timestamp: Date.now()
// Example: 1729334445123
```

---

## Reconnection and Catchup Protocol

### Overview

When mobile reconnects after being offline (network loss, app backgrounded, etc.), it sends the last sequence number it received (`lastSeq`). The server sends a `catchup_request` message to CLI, which must re-send all missed messages.

### Message Flow

```
Mobile                    Server                    CLI
  |                         |                        |
  |  WS connect with        |                        |
  |  lastSeq=100           |                        |
  |----------------------->|                        |
  |                         |                        |
  |                         | catchup_request        |
  |                         | { lastSeq: 100 }       |
  |                         |----------------------->|
  |                         |                        |
  |                         |   Messages 101-150     |
  |                         |   (one by one)         |
  |                         |<-----------------------|
  |   Messages 101-150      |                        |
  |<------------------------|                        |
  |                         |                        |
  |                         |   sync_complete        |
  |                         |   { currentSeq: 150 }  |
  |                         |<-----------------------|
  |   sync_complete         |                        |
  |<------------------------|                        |
  |                         |                        |
```

### Catchup Request Message

**Message Type**: `catchup_request`

```json
{
  "type": "catchup_request",
  "lastSeq": 100,
  "timestamp": "2025-10-19T10:00:00.000Z"
}
```

**Meaning**: Mobile last received message with `seq=100`, needs all messages with `seq > 100`

### Production Pattern Implementation

**CRITICAL**: Messages must be sent **one-by-one with delays**, not all at once.

```javascript
async handleCatchupRequest(message) {
  const lastSeq = message.lastSeq;
  const missedMessages = this.buffer.getAfter(lastSeq);

  logger.info(`Sending ${missedMessages.length} missed messages (seq > ${lastSeq})`);

  // ✅ CORRECT: Send one-by-one with delays
  for (const msg of missedMessages) {
    this.sendOutput(msg.data, msg.seq, msg.timestamp);

    // 50ms delay to ensure message delivery before sending next
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Send sync_complete after all catchup messages
  this.send({
    type: 'sync_complete',
    currentSeq: this.buffer.getCurrentSeq()
  });

  logger.success('Catchup complete');
}

// ❌ WRONG: Sending all at once
missedMessages.forEach(msg => {
  this.sendOutput(msg.data, msg.seq, msg.timestamp);
});
```

**Why the delay?**
- WebSocket messages are buffered and may be sent in batches
- Network conditions can cause messages to arrive out of order
- 50ms delay ensures each message is fully transmitted before sending next
- This pattern was validated through e2e tests (see `termly-be/tests/e2e/backend-e2e.test.ts:590-674`)

### Sync Complete Message

After sending all catchup messages, send `sync_complete`:

```json
{
  "type": "sync_complete",
  "currentSeq": 150
}
```

**Meaning**: All catchup messages have been sent. Mobile is now in sync. Current sequence number is 150.

### Buffer Requirements

To support catchup, CLI must maintain a circular buffer of recent messages:

```javascript
class CircularBuffer {
  constructor(maxSize = 100000) { // 100KB default
    this.buffer = [];
    this.maxSize = maxSize;
  }

  // Get all messages with seq > lastSeq
  getAfter(lastSeq) {
    return this.buffer.filter(item => item.seq > lastSeq);
  }
}
```

**Best Practices**:
- Buffer size: 100KB minimum (stores ~1000 messages typically)
- FIFO eviction: Remove oldest messages when buffer is full
- Store: `{ seq, data, timestamp, size }` for each message
- Keep messages in memory for fast catchup (persistent storage is optional)

---

## Heartbeat Protocol

### Server Sends Ping, CLI Responds with Pong

**Direction**: Server → CLI (ping), CLI → Server (pong)

**Frequency**: Server sends ping every 30 seconds

**Implementation**:

```javascript
// Handle ping from server
handlePing() {
  logger.debug('Received ping from server, sending pong');

  this.send({
    type: 'pong',
    timestamp: new Date().toISOString()
  });
}
```

**Do NOT**:
- ❌ Send ping from CLI to server
- ❌ Start a heartbeat interval in CLI
- ❌ Expect pong response after sending ping

**Why this direction?**
- Server manages connection timeouts
- Server can detect dead connections and clean them up
- CLI just needs to respond to keep connection alive

---

## Best Practices

### 1. Message Ordering

**Always use sequence numbers for ordering**:
- Messages may arrive out of order due to network conditions
- Mobile must buffer and reorder messages by `seq` before displaying
- CLI must maintain monotonically increasing `seq` counter

### 2. Encryption

**Security requirements**:
- Generate **new random IV for every message** (never reuse IVs)
- Use **AES-256-GCM** (authenticated encryption with integrity check)
- Encrypt both directions: CLI→Mobile (output) and Mobile→CLI (input)
- Never send unencrypted terminal data

**Implementation**:
```javascript
const crypto = require('crypto');

function encrypt(data, aesKey) {
  const iv = crypto.randomBytes(12); // 12 bytes for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);

  let ciphertext = cipher.update(data, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext + authTag.toString('base64'),
    iv: iv.toString('base64')
  };
}
```

### 3. Buffer Management

**Circular buffer strategy**:
- Keep last 100KB of messages (approximately 1000 messages)
- Evict oldest messages when buffer is full (FIFO)
- Store complete message data for catchup: `{ seq, data, timestamp, size }`
- Clear buffer on session end

### 4. Error Handling

**Connection errors**:
- WebSocket close: Attempt reconnection with exponential backoff
- Encryption failure: Log error, notify user, do not send unencrypted data
- PTY crash: Update session status, notify mobile, close gracefully

**Message errors**:
- Invalid JSON: Log error, skip message
- Missing sequence numbers: Log warning, continue
- Decryption failure: Log error, skip message, request catchup

### 5. Logging

**What to log**:
- ✅ Connection events (connect, disconnect, reconnect)
- ✅ Pairing events (pairing complete, session ID)
- ✅ Message counts (seq numbers, buffer stats)
- ✅ Errors and warnings

**What NOT to log**:
- ❌ Encryption keys (AES key, private key)
- ❌ Decrypted user input
- ❌ Decrypted terminal output
- ❌ Encrypted message content (security risk if logs are compromised)

---

## Example Complete Flow

```
1. CLI generates pairing code "ABC-123"
2. CLI registers pairing code via REST API
3. CLI connects to WebSocket: ws://server/?type=agent&code=ABC-123
4. User enters "ABC-123" in mobile app
5. Mobile completes pairing via REST API
6. CLI receives pairing_complete with sessionId and mobilePublicKey
7. CLI computes shared AES key using DH
8. CLI starts PTY process (Claude Code)
9. Mobile connects to WebSocket with sessionId
10. CLI receives client_connected
11. PTY outputs "Hello\n"
12. Buffer appends { seq: 1, data: "Hello\n", timestamp: "..." }
13. CLI encrypts "Hello\n" with AES key
14. CLI sends { type: 'output', seq: 1, data: "...", iv: "..." }
15. Mobile receives, decrypts, displays "Hello"
16. User types "pwd" in mobile
17. Mobile encrypts "pwd\n" with AES key
18. Mobile sends { type: 'input', data: "...", iv: "..." }
19. CLI receives, decrypts, writes "pwd\n" to PTY
20. PTY outputs "/home/user\n"
21. Buffer appends { seq: 2, data: "/home/user\n", timestamp: "..." }
22. CLI sends { type: 'output', seq: 2, data: "...", iv: "..." }
23. Mobile displays "/home/user"
24. Mobile app goes to background (lastSeq = 2)
25. PTY outputs more data (seq: 3, 4, 5, ... buffered locally)
26. Mobile app returns from background
27. Mobile reconnects with lastSeq=2
28. Server sends catchup_request { lastSeq: 2 } to CLI
29. CLI retrieves buffer.getAfter(2) → messages 3, 4, 5
30. CLI sends seq=3, waits 50ms
31. CLI sends seq=4, waits 50ms
32. CLI sends seq=5, waits 50ms
33. CLI sends sync_complete { currentSeq: 5 }
34. Mobile displays all missed output
35. Normal operation resumes
```

---

## Testing Your Implementation

### E2E Test Reference

See `termly-be/tests/e2e/backend-e2e.test.ts` for complete test scenarios:

- **Test 3**: CLI agent WebSocket connection
- **Test 4**: Pairing completion flow
- **Test 6**: Mobile connection notifications
- **Test 7**: Data transfer CLI → Mobile (even numbers)
- **Test 8**: Data transfer Mobile → CLI (doubled numbers)
- **Test 9**: Mobile switching between sessions
- **Test 11**: Single device enforcement
- **Test 12**: Reconnection and catchup (production pattern) ⭐ **CRITICAL**
- **Test 13**: Heartbeat (ping/pong)

### Manual Testing Checklist

- [ ] Generate pairing code and QR code
- [ ] Connect to WebSocket successfully
- [ ] Complete pairing with mobile
- [ ] Send terminal output to mobile (verify encryption)
- [ ] Receive user input from mobile (verify decryption)
- [ ] Handle terminal resize events
- [ ] Respond to ping with pong
- [ ] Buffer messages when mobile disconnected
- [ ] Send catchup messages one-by-one with delays
- [ ] Send sync_complete after catchup
- [ ] Verify sequence numbers are monotonically increasing
- [ ] Verify timestamps are ISO 8601 format
- [ ] Handle WebSocket disconnection gracefully
- [ ] Reconnect with exponential backoff

---

## Common Pitfalls

### ❌ **Pitfall 1: Wrong sequence number logic**

```javascript
// WRONG
seq = this.currentSeq++; // Post-increment: first seq is 0
getCurrentSeq() { return this.currentSeq - 1; }

// CORRECT
seq = ++this.currentSeq; // Pre-increment: first seq is 1
getCurrentSeq() { return this.currentSeq; }
```

### ❌ **Pitfall 2: Sending all catchup messages at once**

```javascript
// WRONG
missedMessages.forEach(msg => this.sendOutput(msg));

// CORRECT
for (const msg of missedMessages) {
  this.sendOutput(msg);
  await new Promise(resolve => setTimeout(resolve, 50));
}
```

### ❌ **Pitfall 3: Wrong ping/pong direction**

```javascript
// WRONG: CLI sending ping
setInterval(() => {
  ws.send({ type: 'ping' });
}, 30000);

// CORRECT: CLI responding to ping
handlePing() {
  ws.send({ type: 'pong', timestamp: new Date().toISOString() });
}
```

### ❌ **Pitfall 4: Unix timestamp instead of ISO string**

```javascript
// WRONG
timestamp: Date.now() // 1729334445123

// CORRECT
timestamp: new Date().toISOString() // "2025-10-19T10:30:45.123Z"
```

### ❌ **Pitfall 5: Handling wrong message type for reconnection**

```javascript
// WRONG
case 'client_reconnected':
  this.handleClientReconnected(message);

// CORRECT
case 'catchup_request':
  this.handleCatchupRequest(message);
```

---

## Summary

### Key Takeaways

1. **Sequence numbers**: Start at 1, pre-increment (`++seq`), never reset
2. **Catchup pattern**: Send messages one-by-one with 50ms delays
3. **Ping/pong**: Server sends ping, CLI responds with pong
4. **Timestamps**: Always ISO 8601 format (`new Date().toISOString()`)
5. **Message type**: Handle `catchup_request`, not `client_reconnected`
6. **Encryption**: New IV per message, AES-256-GCM
7. **Buffer**: Circular buffer, 100KB, FIFO eviction

### Implementation Checklist

- [x] WebSocket connection with `?type=agent&code=ABC123`
- [x] Handle `pairing_complete` message
- [x] Handle `client_connected` notification
- [x] Handle `client_disconnected` notification
- [x] Handle `catchup_request` with production pattern
- [x] Handle `input` messages (decrypt and write to PTY)
- [x] Handle `resize` messages (resize PTY)
- [x] Handle `ping` messages (respond with pong)
- [x] Send `output` messages (encrypt PTY output)
- [x] Send `sync_complete` after catchup
- [x] Maintain circular buffer with sequence numbers
- [x] Use ISO 8601 timestamps everywhere
- [x] Start sequence numbers at 1
- [x] Send catchup messages one-by-one with 50ms delays

---

**Last Updated**: 2025-10-19
**Based on**: termly-be e2e tests and protocol documentation
**Validated with**: Test 12 (reconnection/catchup production pattern)
