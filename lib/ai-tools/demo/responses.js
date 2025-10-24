// 50 randomized responses for demo mode
// Topics: AI coding, mobile development, remote terminals, vibe coding, tech wisdom

const RESPONSES = [
  // AI Coding Assistant vibes
  "AI-powered coding is like having a genius pair programmer who never sleeps!",
  "The future of development is collaborative - humans and AI working together.",
  "Code faster, debug smarter, ship sooner. That's the AI advantage.",
  "Sometimes the best code is written when you're away from your desk.",
  "AI assistants don't replace developers, they amplify their potential.",

  // Mobile development
  "Mobile-first isn't just design philosophy - it's a lifestyle.",
  "Your next breakthrough idea might come while you're on the go.",
  "The best development environment is the one you have with you.",
  "Coding from your phone? Welcome to the future!",
  "Distance is no barrier when your terminal fits in your pocket.",

  // Remote terminal access
  "SSH has evolved - now it's in your hand.",
  "Terminal access from anywhere opens infinite possibilities.",
  "Your development machine, always within reach.",
  "The cloud isn't just for deployment anymore.",
  "Remote doesn't mean disconnected.",

  // Vibe coding
  "Great code comes from great vibes.",
  "The best debugging happens with a clear mind.",
  "Inspiration strikes at unexpected moments - be ready!",
  "Code flows better when you're in the zone.",
  "Sometimes you need to step away to see the solution clearly.",

  // Tech wisdom
  "The right tool at the right time makes all the difference.",
  "Automation isn't lazy - it's efficient.",
  "Every line of code is a conversation with the future.",
  "Simplicity is the ultimate sophistication.",
  "Build tools that make you excited to work.",

  // AI tools ecosystem
  "Claude, Aider, Copilot - choose your AI companion wisely.",
  "The best AI tool is the one that matches your workflow.",
  "Multiple AI assistants? Why choose when you can have them all?",
  "Each AI has its strengths - know when to use which.",
  "The AI coding revolution is here, and it's spectacular.",

  // Developer productivity
  "Context switching costs time - keep your flow intact.",
  "The fastest code is the code you don't have to write.",
  "Good tools get out of your way. Great tools elevate your work.",
  "Productivity isn't about hours - it's about focus.",
  "Work smarter, not just harder.",

  // Terminal culture
  "The terminal is where magic happens.",
  "Command line mastery is a superpower.",
  "GUI is great, but CLI is poetry.",
  "Real developers aren't afraid of the terminal.",
  "There's something beautiful about green text on black.",

  // Innovation & future
  "The tools we build today shape tomorrow's possibilities.",
  "Innovation happens when convenience meets capability.",
  "The future of coding is more accessible than ever.",
  "Technology should adapt to you, not the other way around.",
  "We're living in the golden age of developer tools.",

  // Collaboration
  "The best solutions come from diverse perspectives.",
  "Share your workflow, inspire others.",
  "Community-driven development moves faster.",
  "Open source is the rising tide that lifts all boats.",
  "Collaboration multiplies creativity.",
];

/**
 * Get a random response from the pool
 * @returns {string} Random response
 */
function getRandomResponse() {
  const index = Math.floor(Math.random() * RESPONSES.length);
  return RESPONSES[index];
}

module.exports = {
  RESPONSES,
  getRandomResponse
};
