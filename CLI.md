# Задание: Создать CLI утилиту termly-cli

## Описание проекта
Termly CLI - универсальная NPM утилита (global install) которая запускается на компьютере разработчика,
может запустить ЛЮБОЙ AI coding assistant (Claude Code, Aider, GitHub Copilot, Cursor и др.) через PTY,
транслирует весь ввод/вывод на удаленный сервер через WebSocket с end-to-end шифрованием.
Поддерживает session resume, одновременный ввод с нескольких устройств (компьютер + одно мобильное),
автоматический reconnect.

**ВАЖНО:**
- Пользователь может запустить НЕСКОЛЬКО CLI сессий одновременно (например, frontend + backend)
- Каждая CLI сессия - независимый процесс с собственным PTY и WebSocket
- К каждой CLI сессии может подключиться только ОДНО мобильное устройство

## Технический стек
- **Runtime:** Node.js 18+
- **CLI Framework:** Commander.js
- **PTY:** node-pty (псевдотерминал)
- **WebSocket:** ws
- **Криптография:** Node.js crypto (built-in)
- **Config:** conf (для хранения настроек)
- **Prompts:** inquirer
- **Colors:** chalk
- **QR Code:** qrcode-terminal
- **Package Type:** npm global package
- **Package Name:** termly-cli

## Брендинг

**Название:** Termly CLI
**NPM Package:** termly-cli
**Command:** termly
**Domain:** termly.dev
**Server:** api.termly.dev

## Установка пользователем
````bash
# Через install script:
curl -fsSL https://get.termly.dev | bash

# Или через npm:
npm install -g termly-cli

# Или через Homebrew (будущее):
brew install termly
````

После установки команда доступна: `termly`

---

## Команды CLI

### 1. Setup (конфигурация)
````bash
termly setup
````

**Функциональность:**
- Спросить server URL (default: wss://api.termly.dev)
- Сохранить в config (~/.termly/config.json)
- Показать успех

**Interactive prompts:**
- "Server URL" (default показан)
- "Save configuration?" (Y/n)

---

### 2. Start (основная команда)
````bash
termly start [directory] [options]

# Примеры:
termly start                              # текущая директория, auto-detect AI tool
termly start /path/to/project             # указанная директория
termly start --ai aider                   # явно указать AI tool
termly start --ai "claude code"           # явно указать Claude Code
termly start --ai-args "--model gpt-4"    # дополнительные аргументы для AI tool
````

**Options:**
- `--ai <tool>`: Явно указать какой AI tool использовать
- `--ai-args <args>`: Дополнительные аргументы для AI tool
- `--no-auto-detect`: Не использовать auto-detection
- `--debug`: Enable debug logging

**Шаги выполнения:**

**Шаг 1: Version Check**
- Проверить версию CLI против минимальной требуемой версии на сервере
- Если версия устарела → показать ошибку с командой обновления и завершить
- Если сетевая ошибка → пропустить проверку (не блокировать пользователя)

**Шаг 2: Pre-flight Checks**
- Определить workingDir (argument || process.cwd())
- Определить projectName (path.basename(workingDir))

**Шаг 3: Check for Existing Session in Directory**
````javascript
const sessions = loadSessionsRegistry();
const existingInDir = sessions.find(
  s => s.workingDir === workingDir && s.status === 'running'
);

if (existingInDir) {
  console.error(`❌ Session already running in this directory!`);
  console.error(`   Session ID: ${existingInDir.sessionId}`);
  console.error(`   PID: ${existingInDir.pid}`);
  console.error(`   AI Tool: ${existingInDir.aiTool}`);
  console.error(``);
  console.error(`Options:`);
  console.error(`  • Stop it: termly stop ${existingInDir.sessionId}`);
  console.error(`  • Or run in a different directory`);
  process.exit(1);
}
````

**Шаг 4: AI Tool Selection**

**Auto-Detection Mode (default):**
````
Если --ai не указан:
1. Проверить какие AI tools установлены:
   - claude (Claude Code)
   - aider
   - github-copilot-cli
   - cursor
   - cody
   
2. Если найден один: использовать его
3. Если найдено несколько: спросить пользователя
4. Если ничего не найдено: показать ошибку с инструкцией

? Multiple AI tools detected:
  ❯ Claude Code (claude code)
    Aider (aider)
    GitHub Copilot (github-copilot-cli)
    
  Use arrow keys, press Enter to select
````

**Manual Mode:**
````bash
termly start --ai aider

Использовать указанный tool.
Проверить что он установлен, иначе ошибка.
````

**AI Tool Registry:**
````javascript
const AI_TOOLS = {
  'claude-code': {
    command: 'claude',
    args: ['code'],
    displayName: 'Claude Code',
    checkInstalled: async () => commandExists('claude')
  },
  'aider': {
    command: 'aider',
    args: [],
    displayName: 'Aider',
    checkInstalled: async () => commandExists('aider')
  },
  'github-copilot': {
    command: 'github-copilot-cli',
    args: [],
    displayName: 'GitHub Copilot CLI',
    checkInstalled: async () => commandExists('github-copilot-cli')
  },
  'cursor': {
    command: 'cursor',
    args: [],
    displayName: 'Cursor',
    checkInstalled: async () => commandExists('cursor')
  },
  'cody': {
    command: 'cody',
    args: ['chat'],
    displayName: 'Cody',
    checkInstalled: async () => commandExists('cody')
  },
  'custom': {
    // Для custom tools
    command: null, // will be provided by user
    args: [],
    displayName: 'Custom Tool'
  }
};
````

**Шаг 4: Generate Pairing Code**
- Генерировать random code: 6 символов (A-Z, 0-9), format: ABC-123
- Генерировать DH keypair (2048-bit)
- Сохранить privateKey в памяти

**Шаг 5: Register Pairing Code**
- POST /api/pairing
````json
{
  "code": "ABC123",
  "publicKey": "base64...",
  "projectName": "my-project",
  "workingDir": "/Users/user/project",
  "computerName": os.hostname(),
  "aiTool": "aider",
  "aiToolVersion": "0.20.0"
}
````

**Шаг 6: Display QR Code & Code**
````
┌──────────────────────────────────────────┐
│ 🚀 Termly CLI                            │
│                                          │
│ Computer: MacBook Pro                    │
│ AI Tool: Aider v0.20.0                   │
│ Project: my-project                      │
│                                          │
│ To connect your mobile app:              │
│                                          │
│ ╔════════════════════════════════════╗  │
│ ║  █▀▀▀█ ▄▀█▀▄ █▀▀▀█                ║  │
│ ║  █   █ ▀█▄█▀ █   █   QR CODE      ║  │
│ ║  █▄▄▄█ ▀█▀█▀ █▄▄▄█                ║  │
│ ╚════════════════════════════════════╝  │
│                                          │
│ Or enter this code in your app:          │
│                                          │
│      ╔═══════════════╗                  │
│      ║  A B C - 1 2 3  ║                  │
│      ╚═══════════════╝                  │
│                                          │
│ Waiting for connection...                │
│ (Code expires in 5 minutes)              │
└──────────────────────────────────────────┘
````

**QR Code JSON:**
````json
{
  "type": "termly-pairing",
  "code": "ABC123",
  "serverUrl": "wss://api.termly.dev",
  "aiTool": "aider",
  "projectName": "my-project"
}
````

**Шаг 7: Wait for Pairing**
- Connect WebSocket: wss://api.termly.dev/ws/agent?code=ABC123
- Wait for pairing complete message from server
- Server sends mobile's public key
- Compute shared secret: DH(myPrivate, theirPublic)
- Derive AES key: HKDF-SHA256(sharedSecret, "termly-session-key")

**Шаг 8: Register Session**
````javascript
const session = {
  sessionId: generateUUID(),
  pid: process.pid,
  projectName,
  workingDir,
  aiTool: selectedTool.key,
  aiToolDisplayName: selectedTool.displayName,
  computerName: os.hostname(),
  serverUrl: config.serverUrl,
  startedAt: new Date().toISOString(),
  status: 'running'
};

// Save to sessions registry
const registry = loadSessionsRegistry();
registry.push(session);
saveSessionsRegistry(registry);

// Cleanup on exit
process.on('exit', () => {
  session.status = 'stopped';
  saveSessionsRegistry(registry);
});
````

**Шаг 9: Start PTY Session**
````
✅ Connected!
🔒 End-to-End Encryption: ENABLED
   Algorithm: AES-256-GCM + DH-2048
   Fingerprint: A3:B2:C1:D4:E5:F6...
   
Session ID: abc-123-xyz
Computer: MacBook Pro
Project: my-project
AI Tool: Aider v0.20.0
Directory: /Users/user/my-project

Starting Aider...
````

- Spawn PTY: `pty.spawn(selectedTool.command, selectedTool.args)`
- Options:
  - name: 'xterm-256color'
  - cols: 80, rows: 24 (or detect terminal size)
  - cwd: workingDir
  - env: process.env

**Шаг 10: Bidirectional Streaming**

**PTY output → Mobile:**
````javascript
Circular Buffer в памяти (100KB):
- Store последние N данных
- Каждое сообщение с sequence number

pty.onData((data) => {
  // Добавить в buffer
  buffer.append({
    seq: currentSeq++,
    data: data,
    timestamp: Date.now()
  });
  
  // Показать локально
  process.stdout.write(data);
  
  // Отправить подключенному мобильному устройству (если есть)
  if (mobileConnected) {
    const encrypted = encrypt(data, aesKey);
    ws.send(JSON.stringify({
      type: 'output',
      sessionId,
      seq: currentSeq - 1,
      encrypted: true,
      data: encrypted.ciphertext, // base64
      iv: encrypted.iv            // base64
    }));
  }
});
````

**Mobile input → PTY:**
````javascript
ws.on('message', (rawData) => {
  const message = JSON.parse(rawData);
  
  if (message.encrypted) {
    const decrypted = decrypt(
      message.data,
      message.iv,
      aesKey
    );
    
    switch (message.type) {
      case 'input':
        pty.write(decrypted);
        // Также показать локально (echo)
        process.stdout.write(decrypted);
        break;
        
      case 'resize':
        pty.resize(message.cols, message.rows);
        break;
    }
  }
});
````

**Шаг 11: Handle Mobile Connect/Disconnect**
````javascript
ws.on('message', (rawData) => {
  const message = JSON.parse(rawData);
  
  switch (message.type) {
    case 'client_connected':
      console.log(`\n📱 Mobile device connected`);
      mobileConnected = true;
      break;
      
    case 'client_disconnected':
      console.log(`\n📱 Mobile device disconnected`);
      mobileConnected = false;
      break;
      
    case 'client_reconnected':
      console.log(`\n📱 Mobile device reconnected. Sending catchup from seq ${message.lastSeq}`);
      
      // Отправить пропущенные сообщения
      const missedMessages = buffer.getAfter(message.lastSeq);
      
      missedMessages.forEach(msg => {
        const encrypted = encrypt(msg.data, aesKey);
        ws.send(JSON.stringify({
          type: 'output',
          sessionId,
          seq: msg.seq,
          encrypted: true,
          data: encrypted.ciphertext,
          iv: encrypted.iv,
          timestamp: msg.timestamp
        }));
      });
      
      // Завершающее сообщение
      ws.send(JSON.stringify({
        type: 'sync_complete',
        currentSeq: currentSeq - 1
      }));
      
      mobileConnected = true;
      break;
  }
});
````

**Шаг 12: Heartbeat**
````javascript
Send ping every 30 seconds:

setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'ping',
      sessionId
    }));
  }
}, 30000);
````

**Шаг 13: Graceful Shutdown**

**On SIGINT (Ctrl+C):**
````
Shutting down...
✓ Closing PTY
✓ Closing WebSocket
✓ Removing from registry
✓ Cleaning up

Goodbye!
````

**On PTY exit:**
````
Aider exited with code 0
✓ Session ended

Run 'termly start' to create a new session.
````

**Process cleanup:**
- pty.kill()
- ws.close(1000, 'User closed')
- Remove session from registry
- Save buffer to disk (optional, для recovery)
- process.exit(exitCode)

---

### 3. Status (показать активные сессии)
````bash
termly status
termly status --all  # все сессии включая stopped
````

**Показать все активные сессии:**
````
Active Sessions (2):

╭─────────────────────────────────────────╮
│ Session 1                               │
├─────────────────────────────────────────┤
│ Session ID: abc-123                     │
│ Computer:   MacBook Pro                 │
│ AI Tool:    Claude Code v2.0.0          │
│ Project:    frontend                    │
│ Directory:  ~/frontend                  │
│ PID:        12345                       │
│ Uptime:     25 minutes                  │
│ Mobile:     🟢 iPhone connected         │
│ Status:     🟢 Running                  │
╰─────────────────────────────────────────╯

╭─────────────────────────────────────────╮
│ Session 2                               │
├─────────────────────────────────────────┤
│ Session ID: xyz-789                     │
│ Computer:   MacBook Pro                 │
│ AI Tool:    Aider v0.20.0               │
│ Project:    backend                     │
│ Directory:  ~/backend                   │
│ PID:        12346                       │
│ Uptime:     10 minutes                  │
│ Mobile:     🔴 Not connected            │
│ Status:     🟢 Running                  │
╰─────────────────────────────────────────╯

Commands:
  termly stop <session-id>     Stop specific session
  termly stop --all            Stop all sessions
  termly attach <session-id>   Show logs for session
````

**Если вызвано из директории с активной сессией:**
````bash
$ cd ~/frontend
$ termly status

Current Session:
╭─────────────────────────────────────────╮
│ Session ID: abc-123                     │
│ AI Tool:    Claude Code                 │
│ Project:    frontend                    │
│ Uptime:     25 minutes                  │
│ Mobile:     🟢 iPhone connected         │
╰─────────────────────────────────────────╯

Other Active Sessions: 1
  • backend (Aider) - xyz-789

Use 'termly status --all' to see all sessions.
````

---

### 4. Stop (остановить сессию)
````bash
# Остановить текущую (в этой директории)
termly stop

# Остановить конкретную
termly stop abc-123

# Остановить все
termly stop --all

# Интерактивный выбор
termly stop
? Which session to stop?
  ❯ frontend (abc-123) - Claude Code
    backend (xyz-789) - Aider
    [Cancel]
````

**Process:**
1. Find session by ID или в текущей директории
2. Verify process exists (check PID)
3. Send SIGTERM to process
4. Wait for graceful exit (5 seconds)
5. If not exited: send SIGKILL
6. Update registry: status = 'stopped'
7. Show confirmation

---

### 5. List (короткий список)
````bash
termly list
````

**Output:**
````
2 active sessions:

  • abc-123  frontend  Claude Code  🟢 (Mobile connected)
    Fingerprint: A3:B2:C1:D4:E5:F6:12:34:56:78:9A:BC
  • xyz-789  backend   Aider        🔴

Use 'termly status' for details.
````

**Features:**
- Shows encryption fingerprint for verification with mobile app
- Mobile connection status indicator (🟢/🔴)
- Fingerprint displayed only after encryption is established

---

### 6. Tools (управление AI tools)
````bash
termly tools list
termly tools detect
termly tools info <tool-name>
````

**list:**
````bash
$ termly tools list

Available AI Tools:
  ✓ Claude Code (claude)         - installed
  ✓ Aider (aider)                - installed
  ✗ GitHub Copilot (github-copilot-cli) - not installed
  ✓ Cursor (cursor)              - installed
  ✗ Cody (cody)                  - not installed

Use 'termly start --ai <tool>' to use a specific tool
````

**detect:**
````bash
$ termly tools detect

🔍 Detecting installed AI tools...

Found 3 AI tools:
  • Claude Code v2.0.0
  • Aider v0.20.0
  • Cursor v0.15.0

Recommended: Aider (most recently used)
````

**info:**
````bash
$ termly tools info aider

Aider
─────
Command:     aider
Version:     0.20.0
Description: AI pair programming in your terminal
Website:     https://aider.chat
Installed:   ✓ Yes

Example usage:
  termly start --ai aider
  termly start --ai aider --ai-args "--model gpt-4"
````

---

### 7. Config (управление конфигурацией)
````bash
termly config
termly config get <key>
termly config set <key> <value>
````

**Show all:**
````
Current Configuration:

Server URL:     wss://api.termly.dev
Default AI:     (auto-detect)
Config file:    /Users/user/.termly/config.json
Sessions file:  /Users/user/.termly/sessions.json
Last updated:   2024-10-18 10:00

To change: termly config set <key> <value>
````

**set:**
````bash
termly config set serverUrl wss://custom.server.com
termly config set defaultAI aider
````

**get:**
````bash
termly config get serverUrl
# Output: wss://api.termly.dev
````

---

### 8. Cleanup (очистить stale sessions)
````bash
termly cleanup
````

**Функциональность:**
- Проверить все sessions в registry
- Для каждой: проверить существует ли PID
- Если PID не существует: отметить как 'stale'
- Показать список stale sessions
- Спросить подтверждение на удаление
- Удалить из registry

**Output:**
````
Found 2 stale sessions:
  • xyz-789 (backend) - PID 12346 not found
  • old-123 (old-project) - PID 99999 not found

Remove stale sessions? (Y/n): y

✓ Removed 2 stale sessions
````

---

### 9. Version
````bash
termly --version
termly -v
````

Показать версию из package.json.

---

### 10. Help
````bash
termly --help
termly -h
termly <command> --help
````

**Показать:**
````
Usage: termly <command> [options]

Universal terminal access for AI coding assistants

Commands:
  start [dir]         Start AI tool with remote access
  status              Show session status
  stop [id]           Stop session(s)
  list                List active sessions
  tools               Manage AI tools
  config              Manage configuration
  cleanup             Remove stale sessions
  setup               Interactive setup
  
Options:
  -v, --version       Show version
  -h, --help          Show help
  --debug             Enable debug logging

AI Tool Options (for start):
  --ai <tool>         Specify AI tool to use
  --ai-args <args>    Additional arguments for AI tool
  --no-auto-detect    Disable AI tool auto-detection

Examples:
  $ termly start                          # Auto-detect AI tool
  $ termly start --ai aider               # Use Aider
  $ termly start --ai "claude code"       # Use Claude Code
  $ termly tools list                     # List available tools
  $ termly status                         # Show all sessions

Multiple Sessions:
  You can run multiple sessions simultaneously:
  
  Terminal 1:
    $ cd ~/frontend
    $ termly start
  
  Terminal 2:
    $ cd ~/backend
    $ termly start
  
  Each session is independent with its own AI tool.

Supported AI Tools:
  • Claude Code
  • Aider
  • GitHub Copilot CLI
  • Cursor
  • Cody
  • And more...

For more information: https://termly.dev/docs
````

---

## Sessions Registry

### Location:
`~/.termly/sessions.json`

### Structure:
````json
{
  "sessions": [
    {
      "sessionId": "abc-123",
      "pid": 12345,
      "projectName": "frontend",
      "workingDir": "/Users/user/frontend",
      "computerName": "MacBook Pro",
      "aiTool": "claude-code",
      "aiToolDisplayName": "Claude Code",
      "aiToolVersion": "2.0.0",
      "serverUrl": "wss://api.termly.dev",
      "startedAt": "2024-10-18T10:00:00Z",
      "status": "running"
    },
    {
      "sessionId": "xyz-789",
      "pid": 12346,
      "projectName": "backend",
      "workingDir": "/Users/user/backend",
      "computerName": "MacBook Pro",
      "aiTool": "aider",
      "aiToolDisplayName": "Aider",
      "aiToolVersion": "0.20.0",
      "serverUrl": "wss://api.termly.dev",
      "startedAt": "2024-10-18T10:05:00Z",
      "status": "running"
    }
  ]
}
````

### Operations:
````javascript
function loadSessionsRegistry() {
  const path = '~/.termly/sessions.json';
  // Load and parse, validate PIDs
}

function saveSessionsRegistry(sessions) {
  const path = '~/.termly/sessions.json';
  // Save with pretty print
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0); // Signal 0 checks existence
    return true;
  } catch {
    return false;
  }
}
````

---

## Circular Buffer Implementation

### Концепция:

**Зачем:**
- Хранить последние N данных для session resume
- При mobile reconnect: отправить пропущенное

**Размер:**
- Default: 100KB
- Configurable через environment variable

**Structure:**
````javascript
CircularBuffer {
  maxSize: 100000,  // 100KB
  buffer: [
    {
      seq: 1234,
      data: "output text...",
      timestamp: 1697630400000
    },
    ...
  ],
  totalSize: 45000  // current size in bytes
}
````

**Operations:**
- append(item): добавить в конец, удалить старое если overflow
- getAfter(seq): вернуть все items где item.seq > seq
- getAll(): вернуть весь buffer
- clear(): очистить buffer

---

## AI Tool Management

### Detection Logic:
````javascript
async function detectInstalledTools() {
  const tools = [];
  
  for (const [key, tool] of Object.entries(AI_TOOLS)) {
    if (key === 'custom') continue;
    
    try {
      await execAsync(`command -v ${tool.command}`);
      
      // Try to get version
      let version = 'unknown';
      try {
        const versionOutput = await execAsync(`${tool.command} --version`);
        version = parseVersion(versionOutput);
      } catch {
        // version detection failed, continue
      }
      
      tools.push({
        key,
        ...tool,
        version,
        installed: true
      });
    } catch {
      // Tool not found
    }
  }
  
  return tools;
}
````

### User Selection:
````javascript
async function selectAITool(options) {
  if (options.ai) {
    // Manual selection
    return AI_TOOLS[options.ai];
  }
  
  if (options.noAutoDetect) {
    // Ask user to specify
    console.error('Please specify AI tool with --ai flag');
    process.exit(1);
  }
  
  // Auto-detect
  const installed = await detectInstalledTools();
  
  if (installed.length === 0) {
    console.error('❌ No AI tools found. Please install one:');
    console.error('  Claude Code: https://docs.claude.com');
    console.error('  Aider: pip install aider-chat');
    console.error('  GitHub Copilot: gh extension install github/gh-copilot');
    process.exit(1);
  }
  
  if (installed.length === 1) {
    const tool = installed[0];
    console.log(`Using ${tool.displayName} (auto-detected)`);
    return tool;
  }
  
  // Multiple found - ask user
  const answer = await inquirer.prompt([{
    type: 'list',
    name: 'tool',
    message: 'Multiple AI tools detected. Which one to use?',
    choices: installed.map(t => ({
      name: `${t.displayName} (${t.command})`,
      value: t.key
    }))
  }]);
  
  return AI_TOOLS[answer.tool];
}
````

---

## Reconnection Handling (CLI WebSocket)

### CLI's Reconnection Strategy:

**When to reconnect:**
- WebSocket close event (unexpected)
- Network error
- Server restart

**Exponential Backoff:**
- Attempt 1: immediate
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds
- Attempt 4: 8 seconds
- Attempt 5+: 16 seconds
- Max attempts: 10
- After 10 fails: exit gracefully

**During reconnection:**
````
⚠️  Connection lost. Reconnecting...
Attempt 3/10...

[PTY continues working locally]
[Buffer continues storing output]
````

**After successful reconnect:**
````
✅ Reconnected to server!

Syncing with mobile client (if connected)...
````

---

## Encryption Implementation

### DH Key Exchange:

**Generate keypair:**
````javascript
const crypto = require('crypto');

const dh = crypto.createDiffieHellman(2048);
const publicKey = dh.generateKeys();
const privateKey = dh.getPrivateKey();
````

**Compute shared secret:**
````javascript
const sharedSecret = dh.computeSecret(theirPublicKey);
````

**Derive AES key (HKDF):**
````javascript
const hkdf = crypto.hkdfSync(
  'sha256',
  sharedSecret,
  '', // salt
  'termly-session-key', // info
  32  // key length (256 bits)
);
````

### AES-256-GCM Encryption:

**Encrypt:**
````javascript
function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(12); // GCM standard
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    ciphertext: Buffer.concat([ciphertext, authTag]).toString('base64'),
    iv: iv.toString('base64')
  };
}
````

**Decrypt:**
````javascript
function decrypt(encryptedData, ivBase64, key) {
  const combined = Buffer.from(encryptedData, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  
  const authTag = combined.slice(-16);
  const ciphertext = combined.slice(0, -16);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);
  
  return plaintext.toString('utf8');
}
````

---

## Logging

### Log Levels:

**Normal mode:**
- info: важные события (connected, disconnected, session start/stop, AI tool selected, mobile connect/disconnect)
- warn: предупреждения
- error: ошибки

**Debug mode:**
````bash
DEBUG=1 termly start
# Or
termly start --debug
````
- Все как выше
- Plus: все WebSocket messages (но БЕЗ encrypted content!)
- Plus: buffer operations
- Plus: crypto operations
- Plus: AI tool detection details

### Log File:

**Location:** `~/.termly/logs/cli.log`

**Format:**
````
[2024-10-18 10:00:00] INFO: Session started (frontend, aider)
[2024-10-18 10:00:00] INFO: PID: 12345
[2024-10-18 10:00:01] INFO: WebSocket connected
[2024-10-18 10:00:02] INFO: AI Tool: Aider v0.20.0
[2024-10-18 10:02:00] INFO: Mobile device connected
[2024-10-18 10:05:00] WARN: Mobile device disconnected
[2024-10-18 10:05:02] INFO: Mobile device reconnected
[2024-10-18 10:05:02] INFO: Sent catchup: 150 messages
[2024-10-18 10:10:00] ERROR: PTY error: ...
````

**What NOT to log:**
- ❌ Encrypted message content
- ❌ AES keys
- ❌ Private keys
- ❌ User input (может содержать пароли)

---

## Error Handling

### Common Errors & Solutions:

**1. No AI tool found:**
````
❌ Error: No AI tools detected

Please install an AI coding assistant:
  • Claude Code: https://docs.claude.com
  • Aider: pip install aider-chat
  • GitHub Copilot: gh extension install github/gh-copilot
  • Cursor: https://cursor.sh

Then try again: termly start
````

**2. Specific tool not found:**
````
❌ Error: aider is not installed

Install it with:
  pip install aider-chat

Or use auto-detection:
  termly start
````

**3. Session already running in directory:**
````
❌ Session already running in this directory!
   Session ID: abc-123
   PID: 12345
   AI Tool: Aider

Options:
  • Stop it: termly stop abc-123
  • Or run in a different directory
````

**4. Network error:**
````
❌ Error: Cannot connect to server

Check:
- Internet connection
- Server URL: wss://api.termly.dev
- Firewall settings

Trying to reconnect...
````

**5. Invalid directory:**
````
❌ Error: Directory does not exist
Path: /invalid/path

Usage: termly start [directory]
````

**6. Pairing timeout:**
````
⚠️  No mobile device connected within 5 minutes.
Pairing code expired.

Run 'termly start' to generate a new code.
````

**7. PTY error:**
````
❌ Error: aider exited unexpectedly (code 1)

Check:
- Aider is properly installed
- You have necessary permissions
- See logs: ~/.termly/logs/cli.log

For help: https://termly.dev/docs/troubleshooting
````

---

## Configuration Files

### Config File:
`~/.termly/config.json`
````json
{
  "serverUrl": "wss://api.termly.dev",
  "defaultAI": null,
  "version": "1.0.0",
  "lastUpdated": "2024-10-18T10:00:00.000Z"
}
````

### Sessions Registry:
`~/.termly/sessions.json`

(Структура описана выше)

---

## Package.json
````json
{
  "name": "termly-cli",
  "version": "1.0.0",
  "description": "Universal terminal access for AI coding assistants",
  "main": "index.js",
  "bin": {
    "termly": "./bin/cli.js"
  },
  "scripts": {
    "start": "node bin/cli.js",
    "build": "tsc",
    "test": "jest"
  },
  "keywords": [
    "terminal",
    "remote",
    "ai",
    "coding",
    "assistant",
    "claude",
    "aider",
    "copilot",
    "mobile"
  ],
  "author": "Termly Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/termly-dev/termly-cli"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "ws": "^8.14.0",
    "node-pty": "^1.0.0",
    "chalk": "^4.1.2",
    "conf": "^11.0.0",
    "inquirer": "^8.2.5",
    "qrcode-terminal": "^0.12.0"
  }
}
````

---

## Структура проекта
````
cli/
├── bin/
│   └── cli.js                 # Entry point (#!/usr/bin/env node)
├── lib/
│   ├── commands/
│   │   ├── start.js
│   │   ├── status.js
│   │   ├── stop.js
│   │   ├── list.js
│   │   ├── tools.js
│   │   ├── config.js
│   │   ├── cleanup.js
│   │   └── setup.js
│   ├── ai-tools/
│   │   ├── registry.js        # AI tools registry
│   │   ├── detector.js        # Auto-detection
│   │   └── selector.js        # User selection
│   ├── session/
│   │   ├── pty-manager.js     # PTY handling
│   │   ├── buffer.js          # Circular buffer
│   │   ├── registry.js        # Sessions registry
│   │   └── state.js           # Session state
│   ├── network/
│   │   ├── websocket.js       # WebSocket manager
│   │   └── reconnect.js       # Reconnection logic
│   ├── crypto/
│   │   ├── dh.js              # Diffie-Hellman
│   │   └── aes.js             # AES encryption
│   └── utils/
│       ├── logger.js
│       ├── qr.js              # QR code generation
│       ├── pid.js             # PID management
│       └── validation.js
├── package.json
├── README.md
└── .npmignore
````

---

## Installation Script (get.termly.dev)

### Script content:
````bash
#!/bin/bash

set -e

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case $ARCH in
  x86_64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
esac

echo "🚀 Installing Termly CLI..."
echo "   OS: $OS"
echo "   Arch: $ARCH"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found"
  echo ""
  echo "Install Node.js first:"
  echo "  https://nodejs.org"
  exit 1
fi

# Install via npm
echo ""
echo "Installing via npm..."
npm install -g termly-cli

# Verify installation
if command -v termly &> /dev/null; then
  echo ""
  echo "✅ Successfully installed!"
  echo ""
  echo "Get started:"
  echo "  cd your-project"
  echo "  termly start"
  echo ""
  echo "The CLI will auto-detect your AI tools."
  echo ""
  echo "Multiple sessions supported!"
  echo "  Terminal 1: cd ~/frontend && termly start"
  echo "  Terminal 2: cd ~/backend && termly start"
else
  echo "❌ Installation failed"
  exit 1
fi
````

---

## README для пользователей
````markdown
# Termly CLI

Access your AI coding assistants from any device. Works with Claude Code, Aider,
GitHub Copilot, Cursor, and any terminal-based AI tool.

## Installation
```bash
curl -fsSL https://get.termly.dev | bash
```

Or via npm:
```bash
npm install -g termly-cli
```

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
termly status      # Show all sessions
termly stop abc-123  # Stop specific session
termly list        # Quick list
```

## Supported AI Tools

- **Claude Code** - Anthropic's AI coding assistant
- **Aider** - AI pair programming in your terminal
- **GitHub Copilot CLI** - GitHub's command line AI
- **Cursor** - AI-first code editor
- **Cody** - Sourcegraph's AI assistant
- **And more...** - Works with any terminal-based tool

## Commands

- `termly start [dir]` - Start session (auto-detects AI tool)
- `termly start --ai <tool>` - Use specific AI tool
- `termly status` - Show all sessions
- `termly stop [id]` - Stop session(s)
- `termly list` - Quick list
- `termly tools list` - List available AI tools
- `termly config` - Manage configuration
- `termly cleanup` - Remove stale sessions

## Examples
```bash
# Auto-detect and start
termly start

# Use Aider explicitly
termly start --ai aider

# Use Claude Code with custom directory
termly start /path/to/project --ai "claude code"

# Pass arguments to AI tool
termly start --ai aider --ai-args "--model gpt-4"

# List available tools
termly tools list

# Show all active sessions
termly status

# Stop specific session
termly stop abc-123
```

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
termly status  # Find session ID
termly stop abc-123  # Stop it
```

**Logs:** `~/.termly/logs/cli.log`

For issues: https://github.com/termly-dev/termly-cli/issues

## Security

- End-to-end encryption (AES-256-GCM)
- Zero-knowledge server
- One mobile device per session
- Open source

## License

MIT
````

---

## Критерии готовности

✅ NPM package устанавливается глобально
✅ `termly` команда доступна после установки
✅ AI tool auto-detection работает корректно
✅ Пользователь может выбрать tool из списка
✅ Manual AI tool selection работает (--ai flag)
✅ Start command генерирует QR code и pairing code
✅ QR code содержит aiTool metadata
✅ Проверка на существующую сессию в директории работает
✅ Sessions registry создается и управляется корректно
✅ WebSocket подключается к серверу
✅ PTY запускает выбранный AI tool корректно
✅ Вывод транслируется на mobile (encrypted)
✅ Ввод с mobile работает (decrypted)
✅ Локальный терминал продолжает работать одновременно
✅ Circular buffer хранит последние 100KB
✅ Reconnection logic работает (exponential backoff)
✅ Session resume: catchup отправляет пропущенные данные только одному mobile
✅ Handle mobile connect/disconnect/reconnect корректно
✅ E2EE (DH + AES-256-GCM) работает, один ключ на mobile device
✅ Fingerprint показывается для verification
✅ Graceful shutdown (Ctrl+C)
✅ Heartbeat/ping-pong работает
✅ Logging работает корректно
✅ Error handling comprehensive
✅ `termly status` показывает все активные сессии
✅ `termly stop` может остановить конкретную сессию
✅ `termly list` показывает краткий список
✅ `termly tools` commands работают
✅ `termly cleanup` удаляет stale sessions
✅ Config management работает
✅ Работает на Mac (primary target)
✅ Работает на Linux
✅ Красивый CLI output с chalk colors
✅ QR code отображается корректно
✅ Поддерживает Claude Code, Aider, Copilot, Cursor, Cody
✅ Можно добавить custom AI tool
✅ Множественные сессии работают независимо

Создай полностью рабочую CLI утилиту Termly согласно этим требованиям.
