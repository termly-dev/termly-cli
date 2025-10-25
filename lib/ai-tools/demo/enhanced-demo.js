#!/usr/bin/env node

const chalk = require('chalk');
const { getRandomResponse } = require('./responses');

// Gradient colors
const COLOR_PRIMARY = '#7C3AED'; // violet-600
const COLOR_SECONDARY = '#EC4899'; // pink-500

// Original logo frames from logo.js (8 lines: 7-line box + 1-line prompt)
const COMPACT_LOGO_FRAMES = [
  [
    '╭─────────────────╮',
    '│                 │',
    '│     ◉     ◉     │',
    '│                 │',
    '│     ╰─────╯     │',
    '│                 │',
    '╰─────────────────╯',
    '    >  ___'
  ],
  [
    '╭────────────────╮',
    '│                │',
    '│    ◉      ◉    │',
    '│                │',
    '│     ╰────╯     │',
    '│                │',
    '╰────────────────╯',
    '   >  __'
  ],
  [
    '╭───────────────╮',
    '│               │',
    '│   ◉      ◉    │',
    '│               │',
    '│     ╰───╯     │',
    '│               │',
    '╰───────────────╯',
    '   >_'
  ],
  [
    '╭──────────────╮',
    '│              │',
    '│   ◉      )   │',
    '│              │',
    '│     ╰──╯     │',
    '│              │',
    '╰──────────────╯',
    '  >'
  ],
  [
    '╭──────────────╮',
    '│              │',
    '│              │',
    '│              │',
    '│              │',
    '│              │',
    '╰──────────────╯',
    '    __'
  ],
  [
    '╭──────────────╮',
    '│              │',
    '│   (      ◉   │',
    '│              │',
    '│      ╰──╯    │',
    '│              │',
    '╰──────────────╯',
    '       __>'
  ],
  [
    '╭───────────────╮',
    '│               │',
    '│    ◉      ◉   │',
    '│               │',
    '│     ╰───╯     │',
    '│               │',
    '╰───────────────╯',
    '      ___>'
  ],
  [
    '╭────────────────╮',
    '│                │',
    '│     ◉     ◉    │',
    '│                │',
    '│     ╰────╯     │',
    '│                │',
    '╰────────────────╯',
    '    ___ >'
  ]
];

// Screen layout constants
const HEADER_HEIGHT = 8;
const CHAT_HEIGHT = 10;
const FOOTER_HEIGHT = 2;
const TOTAL_HEIGHT = HEADER_HEIGHT + CHAT_HEIGHT + FOOTER_HEIGHT + 2; // +2 for separators

// Chat buffer (circular buffer for 10 lines)
class ChatBuffer {
  constructor(maxLines = 10) {
    this.maxLines = maxLines;
    this.lines = [];
  }

  addLine(text) {
    // Filter out system messages (but keep __INPUT__ placeholder)
    if (text === '__INPUT__') {
      // __INPUT__ is our internal placeholder, allow it
      this.lines.push(text);
      if (this.lines.length > this.maxLines) {
        this.lines.shift();
      }
      return;
    }

    const lowerText = text.toLowerCase();
    const isSystemMessage = text.startsWith('__') ||
                           lowerText.includes('mobile') &&
                           (lowerText.includes('connected') ||
                            lowerText.includes('disconnected')) ||
                           text.includes('📱');

    // Don't add system messages to buffer
    if (isSystemMessage) {
      return;
    }

    this.lines.push(text);
    if (this.lines.length > this.maxLines) {
      this.lines.shift();
    }
  }

  getLines() {
    // Pad with empty lines if less than maxLines
    const padded = [...this.lines];
    while (padded.length < this.maxLines) {
      padded.push('');
    }
    return padded;
  }

  clear() {
    this.lines = [];
  }

  // Clean existing lines from system messages
  cleanSystemMessages() {
    this.lines = this.lines.filter(line => {
      if (line === '__INPUT__') return true; // Keep our placeholder

      const lowerText = line.toLowerCase();
      const isSystemMessage = line.startsWith('__') ||
                             lowerText.includes('mobile') &&
                             (lowerText.includes('connected') ||
                              lowerText.includes('disconnected')) ||
                             line.includes('📱');

      return !isSystemMessage; // Keep only non-system messages
    });
  }
}

// Animation state
class AnimationState {
  constructor() {
    this.logoFrame = 0;
    this.terminalWidth = process.stdout.columns || 80;

    this.line1Text = '✨→→→ Demo Mode Active →→→✨';
    this.line2Text = '✨←←← Demo Mode Active ←←←✨';

    this.line1Pos = -this.line1Text.length; // Line 1 starts off-screen left
    this.line2Pos = this.terminalWidth; // Line 2 starts off-screen right
  }

  updateLogo() {
    this.logoFrame = (this.logoFrame + 1) % COMPACT_LOGO_FRAMES.length;
  }

  updateBanners() {
    // Line 1 moves left to right
    this.line1Pos += 1;
    if (this.line1Pos > this.terminalWidth) {
      this.line1Pos = -this.line1Text.length;
    }

    // Line 2 moves right to left
    this.line2Pos -= 1;
    if (this.line2Pos < -this.line2Text.length) {
      this.line2Pos = this.terminalWidth;
    }
  }
}

// Screen renderer
class ScreenRenderer {
  constructor() {
    this.chatBuffer = new ChatBuffer(CHAT_HEIGHT);
    this.animState = new AnimationState();
    this.currentInput = '';
    this.cursorVisible = true;
  }

  hideCursor() {
    process.stdout.write('\x1B[?25l'); // Hide cursor
  }

  showCursor() {
    process.stdout.write('\x1B[?25h'); // Show cursor
  }

  moveCursor(row, col) {
    process.stdout.write(`\x1B[${row};${col}H`);
  }

  clearScreen() {
    process.stdout.write('\x1B[2J\x1B[H');
  }

  renderHeader() {
    const logo = COMPACT_LOGO_FRAMES[this.animState.logoFrame];
    const description = [
      'Termly Demo Mode',
      '',
      'This is a demonstration version',
      'with randomized AI responses.',
      'Feel free to type anything',
      'and explore the experience.',
      '',
      'Commands: /help, /exit'
    ];

    // Render logo and description side by side
    for (let i = 0; i < HEADER_HEIGHT; i++) {
      this.moveCursor(i + 1, 1);
      process.stdout.write('\x1B[K'); // Clear line

      const logoLine = logo[i] || '';
      const descLine = description[i] || '';

      // Logo in primary color, description in secondary color
      process.stdout.write(chalk.hex(COLOR_PRIMARY)(logoLine));
      if (descLine) {
        process.stdout.write('  ' + chalk.hex(COLOR_SECONDARY)(descLine));
      }
    }
  }

  renderSeparator(row) {
    this.moveCursor(row, 1);
    process.stdout.write(chalk.dim('─'.repeat(process.stdout.columns || 80)));
  }

  renderChat() {
    const startRow = HEADER_HEIGHT + 2; // +1 for separator

    // Clean system messages before rendering
    this.chatBuffer.cleanSystemMessages();

    const lines = this.chatBuffer.getLines();

    for (let i = 0; i < lines.length; i++) {
      this.moveCursor(startRow + i, 1);

      // Clear line first
      process.stdout.write('\x1B[K');

      const line = lines[i];

      // Check if this is the input placeholder
      if (line === '__INPUT__') {
        // Render current input with '>' prefix
        process.stdout.write(chalk.cyan('> ') + chalk.cyan(this.currentInput));

        // Add reverse video cursor
        if (this.cursorVisible) {
          process.stdout.write('\x1B[7m \x1B[27m'); // Reverse video space
        }
      } else if (line) {
        // Normal line
        process.stdout.write(line);
      }
    }
  }

  renderFooter() {
    const footerRow = HEADER_HEIGHT + CHAT_HEIGHT + 3; // +2 for separators, +1 for 0-index
    const termWidth = this.animState.terminalWidth;

    const { line1Pos, line2Pos, line1Text, line2Text } = this.animState;

    // Clear line 1 completely - use \x1B[0K to clear to end of line
    this.moveCursor(footerRow, 1);
    process.stdout.write('\x1B[2K\x1B[0K'); // Clear entire line + clear to end

    // Render line 1 (moves left to right)
    if (line1Pos >= 0 && line1Pos < termWidth) {
      this.moveCursor(footerRow, line1Pos + 1);
      const visibleText = line1Text.substring(0, Math.max(0, termWidth - line1Pos));
      if (visibleText) {
        process.stdout.write(chalk.hex(COLOR_PRIMARY)(visibleText));
      }
    }
    // Clear to end of line after rendering
    process.stdout.write('\x1B[0K');

    // Clear line 2 completely - use \x1B[0K to clear to end of line
    this.moveCursor(footerRow + 1, 1);
    process.stdout.write('\x1B[2K\x1B[0K'); // Clear entire line + clear to end

    // Render line 2 (moves right to left)
    if (line2Pos >= 0 && line2Pos < termWidth) {
      this.moveCursor(footerRow + 1, line2Pos + 1);
      const visibleText = line2Text.substring(0, Math.max(0, termWidth - line2Pos));
      if (visibleText) {
        process.stdout.write(chalk.hex(COLOR_SECONDARY)(visibleText));
      }
    }
    // Clear to end of line after rendering
    process.stdout.write('\x1B[0K');

    // Clear any lines below footer (rows 23+) to prevent artifacts
    for (let i = footerRow + 2; i <= footerRow + 5; i++) {
      this.moveCursor(i, 1);
      process.stdout.write('\x1B[2K\x1B[0K');
    }
  }

  render() {
    this.renderHeader();
    this.renderSeparator(HEADER_HEIGHT + 1);
    this.renderChat();
    this.renderSeparator(HEADER_HEIGHT + CHAT_HEIGHT + 2);
    this.renderFooter();
  }

  addUserInput(text) {
    this.chatBuffer.addLine(chalk.cyan('> ') + chalk.cyan(text));
    this.currentInput = '';
  }

  addAIResponse(text) {
    this.chatBuffer.addLine(chalk.hex(COLOR_SECONDARY)('● ') + chalk.hex(COLOR_SECONDARY)(text));
  }
}

// Main demo controller
class DemoController {
  constructor() {
    this.renderer = new ScreenRenderer();
    this.logoInterval = null;
    this.bannerInterval = null;
    this.cursorInterval = null;
    this.running = false;
  }

  start() {
    this.running = true;

    // Hide real cursor
    this.renderer.hideCursor();

    // Clear screen initially
    this.renderer.clearScreen();

    // Add welcome message
    this.renderer.chatBuffer.addLine('  ' + chalk.hex(COLOR_PRIMARY)('Welcome to Termly Demo Mode!'));
    this.renderer.chatBuffer.addLine('  ' + chalk.dim('Type anything or use /help, /exit'));
    this.renderer.chatBuffer.addLine('');
    this.renderer.chatBuffer.addLine('__INPUT__'); // Placeholder for current input

    // Start animations
    this.logoInterval = setInterval(() => {
      this.renderer.animState.updateLogo();
      this.renderer.render();
    }, 200); // Slow rotation

    this.bannerInterval = setInterval(() => {
      this.renderer.animState.updateBanners();
      this.renderer.render();
    }, 80); // Fast movement

    // Cursor blink
    this.cursorInterval = setInterval(() => {
      this.renderer.cursorVisible = !this.renderer.cursorVisible;
      this.renderer.renderChat();
    }, 500);

    // Initial render
    this.renderer.render();

    // Setup input handling
    this.setupInput();

    // Setup terminal resize handling
    this.setupResize();
  }

  stop() {
    this.running = false;

    if (this.logoInterval) clearInterval(this.logoInterval);
    if (this.bannerInterval) clearInterval(this.bannerInterval);
    if (this.cursorInterval) clearInterval(this.cursorInterval);

    // Remove resize listener
    if (this.resizeHandler) {
      process.stdout.removeListener('resize', this.resizeHandler);
    }

    this.renderer.showCursor();
    this.renderer.clearScreen();
  }

  setupResize() {
    // Handle terminal resize
    this.resizeHandler = () => {
      const oldWidth = this.renderer.animState.terminalWidth;
      const newWidth = process.stdout.columns || 80;

      // Clear footer lines + 2 extra lines below to remove any artifacts
      const footerRow = HEADER_HEIGHT + CHAT_HEIGHT + 3;
      for (let i = 0; i < FOOTER_HEIGHT + 2; i++) {
        this.renderer.moveCursor(footerRow + i, 1);
        process.stdout.write('\x1B[2K\x1B[0K'); // Clear entire line + clear to end
      }

      // Update terminal width
      this.renderer.animState.terminalWidth = newWidth;

      // Clear and redraw screen
      this.renderer.clearScreen();
      this.renderer.render();
    };

    process.stdout.on('resize', this.resizeHandler);
  }

  setupInput() {
    process.stdin.setEncoding('utf8');
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    let buffer = '';

    process.stdin.on('data', (chunk) => {
      for (const char of chunk) {
        const code = char.charCodeAt(0);

        // Ctrl+C
        if (code === 3) {
          this.stop();
          console.log(chalk.yellow('\n\nExiting demo mode. Thanks for exploring Termly!\n'));
          process.exit(0);
        }

        // Enter
        if (code === 13 || code === 10) {
          const trimmed = buffer.trim();

          // Check if system message
          const isSystemMessage = trimmed.startsWith('__') ||
                                  trimmed.toLowerCase().includes('mobile') &&
                                  (trimmed.toLowerCase().includes('connected') ||
                                   trimmed.toLowerCase().includes('disconnected')) ||
                                  trimmed.includes('📱');

          if (isSystemMessage) {
            // System message detected - clear currentInput and redraw screen
            this.renderer.currentInput = ''; // Clear the input that was being typed
            buffer = ''; // Clear buffer
            this.renderer.clearScreen();
            this.renderer.render();
            continue;
          } else if (trimmed) {
            this.handleInput(trimmed);
          }
          buffer = '';
          continue;
        }

        // Backspace
        if (code === 127 || code === 8) {
          // Remove last character (handle UTF-8 multi-byte)
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1);
            this.updateCurrentInput(buffer);
          }
          continue;
        }

        // Allow all printable characters including UTF-8 (Cyrillic, etc.)
        // Accept: ASCII printable (32-126) + all UTF-8 characters (>= 128)
        if (code >= 32) {
          buffer += char;
          this.updateCurrentInput(buffer);
        }
      }
    });

    process.on('SIGINT', () => {
      this.stop();
      console.log(chalk.yellow('\n\nExiting demo mode. Thanks for exploring Termly!\n'));
      process.exit(0);
    });
  }

  updateCurrentInput(text) {
    // Update current input in renderer
    this.renderer.currentInput = text;
    // No need to call full render, cursor blink and animation will update
  }

  handleInput(input) {
    // Add user input to buffer (replace __INPUT__ placeholder)
    // Note: System messages are already filtered in setupInput()
    const lines = this.renderer.chatBuffer.lines;
    const inputIdx = lines.findIndex(l => l === '__INPUT__');
    if (inputIdx >= 0) {
      lines[inputIdx] = chalk.cyan('> ') + chalk.cyan(input);
    }

    // Reset current input
    this.renderer.currentInput = '';

    // Handle special commands
    if (input === '/exit') {
      this.stop();
      console.log(chalk.yellow('\n\nExiting demo mode. Thanks for exploring Termly!\n'));
      process.exit(0);
    }

    if (input === '/help') {
      this.renderer.addAIResponse('Commands: /help, /exit');
      this.renderer.chatBuffer.addLine('__INPUT__'); // New input placeholder
      this.renderer.render();
      return;
    }

    // Get random AI response
    const response = getRandomResponse();
    this.renderer.addAIResponse(response);

    // Add new input placeholder
    this.renderer.chatBuffer.addLine('__INPUT__');

    this.renderer.render();
  }
}

// Run if executed directly
if (require.main === module) {
  const demo = new DemoController();
  demo.start();
}

module.exports = {
  DemoController
};
