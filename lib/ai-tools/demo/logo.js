const chalk = require('chalk');

// ASCII art logo based on Termly's icon (smiley face + terminal prompt)
// 8 frames showing 360° rotation
const LOGO_FRAMES = [
  // Frame 0 - Front view
  `
     ╭─────────────────╮
     │                 │
     │    ◉     ◉     │
     │                 │
     │    ╰─────╯     │
     │                 │
     ╰─────────────────╯
        >  ___
  `,
  // Frame 1 - Slight right turn
  `
     ╭────────────────╮
     │                │
     │   ◉      ◉    │
     │                │
     │     ╰────╯    │
     │                │
     ╰────────────────╯
        > ___
  `,
  // Frame 2 - More right turn
  `
     ╭───────────────╮
     │               │
     │  ◉       ◉   │
     │               │
     │    ╰───╯     │
     │               │
     ╰───────────────╯
        >___
  `,
  // Frame 3 - Side view (right)
  `
     ╭──────────────╮
     │              │
     │  ◉      )    │
     │              │
     │   ╰──╯       │
     │              │
     ╰──────────────╯
        >__
  `,
  // Frame 4 - Back view (no face visible)
  `
     ╭─────────────────╮
     │                 │
     │                 │
     │                 │
     │                 │
     │                 │
     ╰─────────────────╯
        __
  `,
  // Frame 5 - Side view (left)
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
  // Frame 6 - Left turn
  `
     ╭───────────────╮
     │               │
     │  ◉       ◉   │
     │               │
     │    ╰───╯     │
     │               │
     ╰───────────────╯
        ___>
  `,
  // Frame 7 - Almost front
  `
     ╭────────────────╮
     │                │
     │   ◉      ◉    │
     │                │
     │    ╰────╯     │
     │                │
     ╰────────────────╯
        ___ >
  `,
];

/**
 * Displays animated spinning logo
 * @param {number} duration - Duration in milliseconds
 * @param {number} frameDelay - Delay between frames in ms
 */
async function displayAnimatedLogo(duration = 3000, frameDelay = 200) {
  return new Promise((resolve) => {
    let currentFrame = 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      // Clear previous output
      process.stdout.write('\x1B[2J\x1B[H');

      // Display current frame with gradient colors
      const frame = LOGO_FRAMES[currentFrame];
      const lines = frame.split('\n');

      // Face part (purple to pink gradient)
      const facePart = lines.slice(0, 8).join('\n');
      const promptPart = lines.slice(8).join('\n');

      const coloredFrame = chalk.hex('#6366F1')(facePart) +
                          '\n' +
                          chalk.hex('#EC4899')(promptPart);

      process.stdout.write(coloredFrame);

      // Move to next frame
      currentFrame = (currentFrame + 1) % LOGO_FRAMES.length;

      // Check if animation should stop
      if (Date.now() - startTime >= duration) {
        clearInterval(interval);
        process.stdout.write('\x1B[2J\x1B[H'); // Clear screen one last time
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

  const coloredLogo = chalk.hex('#6366F1')(facePart) +
                     '\n' +
                     chalk.hex('#EC4899')(promptPart);

  console.log(coloredLogo);
}

module.exports = {
  displayAnimatedLogo,
  displayStaticLogo,
  LOGO_FRAMES
};
