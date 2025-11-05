# Windows Debug Instructions

This branch includes detailed logging to diagnose Windows-specific issues with PTY output and mobile display.

## How to Use Debug Mode

### 1. Run CLI with debug flag:

**Windows (PowerShell):**
```powershell
$env:DEBUG="1"
termly-dev start --debug
```

**Windows (CMD):**
```cmd
set DEBUG=1
termly-dev start --debug
```

**Mac/Linux:**
```bash
DEBUG=1 termly-dev start --debug
```

### 2. View Logs

**Windows:**
```powershell
# View entire log
Get-Content $env:USERPROFILE\.termly\logs\cli.log

# Follow log in real-time
Get-Content $env:USERPROFILE\.termly\logs\cli.log -Wait -Tail 50

# Open in Notepad
notepad $env:USERPROFILE\.termly\logs\cli.log
```

**Mac/Linux:**
```bash
# View entire log
cat ~/.termly/logs/cli.log

# Follow log in real-time
tail -f ~/.termly/logs/cli.log
```

## What Gets Logged

### PTY Input (from mobile → CLI)
```
[DEBUG] WS Input received (5 bytes):
[DEBUG]   Text: hello
[DEBUG]   Hex:  68 65 6c 6c 6f

[DEBUG] PTY Input (5 bytes):
[DEBUG]   Text: hello
[DEBUG]   Hex:  68 65 6c 6c 6f
```

### PTY Output (from AI tool → mobile)
```
[DEBUG] PTY Raw Output (14 bytes):
[DEBUG]   Text: Hello World\r\n
[DEBUG]   Hex:  48 65 6c 6c 6f 20 57 6f 72 6c 64 0d 0a

[DEBUG] WS Output sending (14 bytes):
[DEBUG]   Text: Hello World\r\n
[DEBUG]   Hex:  48 65 6c 6c 6f 20 57 6f 72 6c 64 0d 0a
```

## What to Look For

### 1. Line Ending Issues (CRLF vs LF)
- **Windows:** `\r\n` (hex: `0d 0a`)
- **Mac/Linux:** `\n` (hex: `0a`)

If Windows logs show `\r\n` but Mac shows only `\n`, this explains rendering differences.

### 2. Duplicate Data
Compare PTY output with WS output:
- If they're identical → problem is in mobile app rendering
- If WS output has duplicates → problem is in CLI logic

### 3. Escape Sequences
Look for `\x1b[...` patterns (ANSI escape codes):
- Different codes between Windows/Mac → different terminal behavior
- Extra codes → cmd.exe adding formatting

### 4. Echo Issues
If you see the same input twice:
- Once as "PTY Input" (what you typed)
- Again as "PTY Output" (echo from cmd.exe)

This means cmd.exe is echoing input back.

## Collecting Logs for Comparison

### On Windows:
1. Run: `termly-dev start --debug`
2. Type a few characters on mobile
3. Copy log: `Get-Content $env:USERPROFILE\.termly\logs\cli.log | Set-Clipboard`
4. Paste into file: `windows-log.txt`

### On Mac:
1. Run: `termly-dev start --debug`
2. Type the same characters on mobile
3. Copy log: `cat ~/.termly/logs/cli.log | pbcopy`
4. Paste into file: `mac-log.txt`

### Compare:
```bash
diff windows-log.txt mac-log.txt
```

Look for differences in:
- Hex values
- Line endings (`\r\n` vs `\n`)
- Escape sequences
- Duplicate data

## Expected Differences

### Normal (platform-specific):
- Line endings: `\r\n` (Windows) vs `\n` (Unix)
- Terminal type codes
- Path separators

### Problematic (needs fixing):
- Duplicate characters
- Extra escape sequences causing artifacts
- Different data being sent to mobile
