// termlyLogo.js
// Enhanced 3D rotating ASCII logo animation for terminal
// Based on original Termly icon (purple-pink gradient)

const chalk = require('chalk');

// Gradient colors extracted from SVG
const COLOR_PRIMARY = '#7C3AED'; // violet-600
const COLOR_SECONDARY = '#EC4899'; // pink-500

// 8 frames of 3D rotation (compact, 10–12 lines)
const LOGO_FRAMES = [
  `
     ╭─────────────────╮
     │                 │
     │     ◉     ◉     │
     │                 │
     │     ╰─────╯     │
     │                 │
     ╰─────────────────╯
         >  ___
  `,
  `
     ╭────────────────╮
     │                │
     │    ◉      ◉    │
     │                │
     │     ╰────╯     │
     │                │
     ╰────────────────╯
        >  __
  `,
  `
     ╭───────────────╮
     │               │
     │   ◉      ◉    │
     │               │
     │     ╰───╯     │
     │               │
     ╰───────────────╯
        >_
  `,
  `
     ╭──────────────╮
     │              │
     │   ◉      )   │
     │              │
     │     ╰──╯     │
     │              │
     ╰──────────────╯
       >
  `,
  `
     ╭──────────────╮
     │              │
     │              │
     │              │
     │              │
     │              │
     ╰──────────────╯
         __
  `,
  `
     ╭──────────────╮
     │              │
     │   (      ◉   │
     │              │
     │      ╰──╯    │
     │              │
     ╰──────────────╯
            __>
  `,
  `
     ╭───────────────╮
     │               │
     │    ◉      ◉   │
     │               │
     │     ╰───╯     │
     │               │
     ╰───────────────╯
           ___>
  `,
  `
     ╭────────────────╮
     │                │
     │     ◉     ◉    │
     │                │
     │     ╰────╯     │
     │                │
     ╰────────────────╯
         ___ >
  `
];

/**
 * Displays animated spinning logo
 * @param {number} duration - Duration in milliseconds
 * @param {number} frameDelay - Delay between frames in ms
 */
async function displayAnimatedLogo(duration = 4000, frameDelay = 150) {
  return new Promise((resolve) => {
    let currentFrame = 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      // Clear terminal
      process.stdout.write('\x1B[2J\x1B[H');

      // Current frame
      const frame = LOGO_FRAMES[currentFrame];
      const lines = frame.split('\n');

      const facePart = lines.slice(0, 8).join('\n');
      const promptPart = lines.slice(8).join('\n');

      // Gradient effect using chalk
      const coloredFrame =
        chalk.hex(COLOR_PRIMARY)(facePart) +
        '\n' +
        chalk.hex(COLOR_SECONDARY)(promptPart);

      process.stdout.write(coloredFrame);

      currentFrame = (currentFrame + 1) % LOGO_FRAMES.length;

      if (Date.now() - startTime >= duration) {
        clearInterval(interval);
        process.stdout.write('\x1B[2J\x1B[H');
        displayStaticLogo();
        resolve();
      }
    }, frameDelay);
  });
}

/**
 * Displays static logo
 */
function displayStaticLogo() {
  const logo = LOGO_FRAMES[0];
  const lines = logo.split('\n');
  const facePart = lines.slice(0, 8).join('\n');
  const promptPart = lines.slice(8).join('\n');

  const coloredLogo =
    chalk.hex(COLOR_PRIMARY)(facePart) +
    '\n' +
    chalk.hex(COLOR_SECONDARY)(promptPart);

  console.log(coloredLogo);
}

module.exports = {
  displayAnimatedLogo,
  displayStaticLogo,
  LOGO_FRAMES,
};

// Run directly for demo
if (require.main === module) {
  (async () => {
    await displayAnimatedLogo(5000, 120);
  })();
}
