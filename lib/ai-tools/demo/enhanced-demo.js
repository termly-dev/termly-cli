#!/usr/bin/env node

const chalk = require('chalk');
const { getRandomResponse } = require('./responses');

// Gradient colors
const COLOR_PRIMARY = '#7C3AED'; // violet-600
const COLOR_SECONDARY = '#EC4899'; // pink-500

// Compact 5-line logo frames (without bottom prompt part)
const COMPACT_LOGO_FRAMES = [
  [
    '╭─────╮',
    '│ ◉ ◉ │',
    '│ ─── │',
    '│╰───╯│',
    '╰─────╯'
  ],
  [
    '╭────╮',
    '│◉  ◉│',
    '│ ── │',
    '│╰──╯│',
    '╰────╯'
  ],
  [
    '╭────╮',
    '│◉  ◉│',
    '│ ─  │',
    '│╰─╯ │',
    '╰────╯'
  ],
  [
    '╭───╮',
    '│◉ )│',
    '│   │',
    '│╰╯ │',
    '╰───╯'
  ],
  [
    '╭───╮',
    '│   │',
    '│   │',
    '│   │',
    '╰───╯'
  ],
  [
    '╭───╮',
    '│( ◉│',
    '│   │',
    '│ ╰╯│',
    '╰───╯'
  ],
  [
    '╭────╮',
    '│ ◉ ◉│',
    '│  ─ │',
    '│ ╰─╯│',
    '╰────╯'
  ],
  [
    '╭─────╮',
    '│ ◉ ◉ │',
    '│ ──  │',
    '│ ╰──╯│',
    '╰─────╯'
  ]
];

// Screen layout constants
const HEADER_HEIGHT = 5;
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
}

// Animation state
class AnimationState {
  constructor() {
    this.logoFrame = 0;
    this.banner1Pos = 0;
    this.banner2Pos = 60; // Start from right
    this.promptPos = 60;
    this.promptOnTop = false;
    this.terminalWidth = process.stdout.columns || 80;

    this.banner1Text = '✨→→→ Demo Mode Active →→→✨';
    this.banner2Text = '✨→→→ Demo Mode Active →→→✨';
    this.promptText = '>_';
  }

  updateLogo() {
    this.logoFrame = (this.logoFrame + 1) % COMPACT_LOGO_FRAMES.length;
  }

  updateBanners() {
    // Banner 1 moves left to right
    this.banner1Pos += 1;
    if (this.banner1Pos > this.terminalWidth) {
      this.banner1Pos = -this.banner1Text.length;
    }

    // Prompt moves right to left
    this.promptPos -= 1;
    if (this.promptPos < -this.promptText.length) {
      this.promptPos = this.terminalWidth;
      this.promptOnTop = false;
    }

    // Check collision (when they meet)
    const banner1End = this.banner1Pos + this.banner1Text.length;
    if (!this.promptOnTop &&
        this.promptPos >= this.banner1Pos &&
        this.promptPos <= banner1End) {
      this.promptOnTop = true;
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
      'This is a demonstration version with',
      'randomized responses. Feel free to type',
      'anything and explore the experience.'
    ];

    // Position at top
    this.moveCursor(1, 1);

    // Render logo and description side by side
    for (let i = 0; i < HEADER_HEIGHT; i++) {
      const logoLine = logo[i] || '';
      const descLine = description[i] || '';

      const colored = chalk.hex(COLOR_PRIMARY)(logoLine.padEnd(10)) +
                     chalk.hex(COLOR_SECONDARY)(descLine);

      process.stdout.write(colored);

      if (i < HEADER_HEIGHT - 1) {
        process.stdout.write('\n');
      }
    }
  }

  renderSeparator(row) {
    this.moveCursor(row, 1);
    process.stdout.write(chalk.dim('─'.repeat(process.stdout.columns || 80)));
  }

  renderChat() {
    const startRow = HEADER_HEIGHT + 2; // +1 for separator
    const lines = this.chatBuffer.getLines();

    for (let i = 0; i < lines.length; i++) {
      this.moveCursor(startRow + i, 1);

      // Clear line first
      process.stdout.write('\x1B[K');

      if (lines[i]) {
        process.stdout.write(lines[i]);
      }
    }

    // Show cursor on current input line
    const lastLineIndex = lines.length - 1;
    const lastLine = lines[lastLineIndex];

    if (lastLine && lastLine.startsWith('User: ')) {
      const inputText = lastLine.substring(6);
      this.moveCursor(startRow + lastLineIndex, 7 + inputText.length);

      // Reverse video cursor
      if (this.cursorVisible) {
        process.stdout.write(chalk.inverse(' '));
      }
    }
  }

  renderFooter() {
    const footerRow = HEADER_HEIGHT + CHAT_HEIGHT + 3; // +2 for separators, +1 for 0-index

    // Clear both footer lines
    this.moveCursor(footerRow, 1);
    process.stdout.write('\x1B[K');
    this.moveCursor(footerRow + 1, 1);
    process.stdout.write('\x1B[K');

    const { banner1Pos, promptPos, promptOnTop, banner1Text, promptText } = this.animState;

    if (promptOnTop) {
      // Render line 1: both banner and prompt
      this.moveCursor(footerRow, 1);

      // Render banner1
      if (banner1Pos >= 0) {
        this.moveCursor(footerRow, banner1Pos + 1);
        process.stdout.write(chalk.hex(COLOR_PRIMARY)(banner1Text));
      }

      // Render prompt on top
      if (promptPos >= 0) {
        this.moveCursor(footerRow, promptPos + 1);
        process.stdout.write(chalk.hex(COLOR_SECONDARY)(promptText));
      }

      // Line 2: empty or banner2
      // (for now keep it simple)
    } else {
      // Render line 1: banner1
      this.moveCursor(footerRow, 1);
      if (banner1Pos >= 0) {
        this.moveCursor(footerRow, banner1Pos + 1);
        process.stdout.write(chalk.hex(COLOR_PRIMARY)(banner1Text));
      }

      // Render line 2: prompt
      this.moveCursor(footerRow + 1, 1);
      if (promptPos >= 0) {
        this.moveCursor(footerRow + 1, promptPos + 1);
        process.stdout.write(chalk.hex(COLOR_SECONDARY)(promptText));
      }
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
    this.chatBuffer.addLine(chalk.cyan('User: ') + text);
    this.currentInput = '';
  }

  addAIResponse(text) {
    this.chatBuffer.addLine(chalk.hex(COLOR_SECONDARY)('AI: ') + text);
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
    this.renderer.chatBuffer.addLine(chalk.hex(COLOR_PRIMARY)('Welcome to Termly Demo Mode!'));
    this.renderer.chatBuffer.addLine(chalk.dim('Type anything or use /help, /exit'));
    this.renderer.chatBuffer.addLine('');
    this.renderer.chatBuffer.addLine('User: ');

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
  }

  stop() {
    this.running = false;

    if (this.logoInterval) clearInterval(this.logoInterval);
    if (this.bannerInterval) clearInterval(this.bannerInterval);
    if (this.cursorInterval) clearInterval(this.cursorInterval);

    this.renderer.showCursor();
    this.renderer.clearScreen();
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
          if (buffer.trim()) {
            this.handleInput(buffer.trim());
            buffer = '';
          }
          continue;
        }

        // Backspace
        if (code === 127 || code === 8) {
          buffer = buffer.slice(0, -1);
          this.updateCurrentInput(buffer);
          continue;
        }

        // Regular character
        if (code >= 32 && code < 127) {
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
    // Update last line in buffer with current input
    const lines = this.renderer.chatBuffer.lines;
    if (lines.length > 0) {
      const lastIdx = lines.length - 1;
      if (lines[lastIdx].startsWith('User: ') || lines[lastIdx] === '') {
        lines[lastIdx] = chalk.cyan('User: ') + text;
      }
    }
    this.renderer.render();
  }

  handleInput(input) {
    // Add user input to buffer
    this.renderer.addUserInput(input);

    // Handle special commands
    if (input === '/exit') {
      this.stop();
      console.log(chalk.yellow('\n\nExiting demo mode. Thanks for exploring Termly!\n'));
      process.exit(0);
    }

    if (input === '/help') {
      this.renderer.addAIResponse('Commands: /help, /exit');
      this.renderer.chatBuffer.addLine('User: ');
      this.renderer.render();
      return;
    }

    // Get random AI response
    const response = getRandomResponse();
    this.renderer.addAIResponse(response);

    // Add new input line
    this.renderer.chatBuffer.addLine('User: ');

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
