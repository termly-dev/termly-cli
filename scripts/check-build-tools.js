#!/usr/bin/env node

/**
 * Pre-install check for required build tools
 * Prevents cryptic node-gyp errors by checking for build dependencies upfront
 */

const { execSync } = require('child_process');
const { platform } = require('os');

const COLORS = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function colorize(text, color) {
  return `${color}${text}${COLORS.reset}`;
}

function commandExists(command) {
  try {
    const checkCmd = platform() === 'win32' ? `where ${command}` : `which ${command}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkLinux(packageName) {
  const hasMake = commandExists('make');
  const hasGCC = commandExists('gcc') || commandExists('g++');
  const hasPython = commandExists('python3') || commandExists('python');

  if (!hasMake || !hasGCC || !hasPython) {
    console.error('\n\n');
    console.error(colorize('╔════════════════════════════════════════════════════════════════╗', COLORS.red));
    console.error(colorize('║  ❌ INSTALLATION BLOCKED - Missing Build Tools                 ║', COLORS.red));
    console.error(colorize('╚════════════════════════════════════════════════════════════════╝', COLORS.red));
    console.error('\n' + colorize('Termly CLI cannot install without build tools.', COLORS.bold));
    console.error('\nMissing:');
    if (!hasMake) console.error(colorize('  ✗ make', COLORS.red));
    if (!hasGCC) console.error(colorize('  ✗ gcc/g++', COLORS.red));
    if (!hasPython) console.error(colorize('  ✗ python3', COLORS.red));

    console.error('\n' + colorize('Install required tools:', COLORS.cyan));

    // Detect Linux distribution
    let distro = 'unknown';
    try {
      const osRelease = require('fs').readFileSync('/etc/os-release', 'utf8');
      if (osRelease.includes('Ubuntu') || osRelease.includes('Debian')) {
        distro = 'debian';
      } else if (osRelease.includes('Amazon Linux') || osRelease.includes('Red Hat') || osRelease.includes('CentOS') || osRelease.includes('Fedora')) {
        distro = 'rhel';
      } else if (osRelease.includes('Alpine')) {
        distro = 'alpine';
      }
    } catch {}

    if (distro === 'debian') {
      console.error('\n  ' + colorize('sudo apt-get update', COLORS.yellow));
      console.error('  ' + colorize('sudo apt-get install -y build-essential python3', COLORS.yellow));
    } else if (distro === 'rhel') {
      console.error('\n  ' + colorize('sudo yum install -y gcc-c++ make python3', COLORS.yellow));
    } else if (distro === 'alpine') {
      console.error('\n  ' + colorize('apk add --no-cache make gcc g++ python3', COLORS.yellow));
    } else {
      // Generic instructions
      console.error('\n  Ubuntu/Debian:');
      console.error('    ' + colorize('sudo apt-get install -y build-essential python3', COLORS.yellow));
      console.error('\n  RHEL/CentOS/Fedora/Amazon Linux:');
      console.error('    ' + colorize('sudo yum install -y gcc-c++ make python3', COLORS.yellow));
    }

    console.error('\n' + colorize('Then retry installation:', COLORS.cyan));
    console.error('  ' + colorize(`npm install -g ${packageName}`, COLORS.yellow));
    console.error('\n' + colorize('────────────────────────────────────────────────────────────────', COLORS.yellow));
    console.error('');

    process.exit(1);
  } else {
    console.log('\n' + colorize('✓ Linux Build Tools Check Passed', COLORS.cyan));
    console.log(colorize('  ✓ make found', COLORS.cyan));
    console.log(colorize('  ✓ gcc/g++ found', COLORS.cyan));
    console.log(colorize('  ✓ python found', COLORS.cyan));
    console.log('');
  }
}

function checkMacOS() {
  // macOS usually works out-of-the-box with Xcode CLI tools
  // Only check if xcode-select exists
  try {
    execSync('xcode-select -p', { stdio: 'ignore' });
    console.log('\n' + colorize('✓ macOS Build Tools Check Passed', COLORS.cyan));
    console.log(colorize('  ✓ Xcode Command Line Tools found', COLORS.cyan));
    console.log('');
  } catch {
    console.warn('\n' + colorize('⚠️  Warning: Xcode Command Line Tools not detected', COLORS.yellow));
    console.warn('\nIf installation fails, run:');
    console.warn('  ' + colorize('xcode-select --install', COLORS.cyan));
    console.warn('\n' + colorize('Attempting installation anyway (prebuilt binaries may work)...', COLORS.yellow));
    console.warn('');
    // Don't exit - let npm try, prebuilt binaries might work
  }
}

function checkVisualStudio() {
  // Check for Visual Studio installation via file system
  const fs = require('fs');

  const possiblePaths = [
    'C:\\Program Files\\Microsoft Visual Studio\\2022',
    'C:\\Program Files\\Microsoft Visual Studio\\2019',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019'
  ];

  for (const basePath of possiblePaths) {
    if (fs.existsSync(basePath)) {
      return true;
    }
  }

  return false;
}

function checkSpectreLibs() {
  // Check for Spectre-mitigated libraries in any VS version
  const fs = require('fs');
  const path = require('path');

  // Determine which architecture to check
  const arch = process.arch;
  const spectreArchs = arch === 'arm64' ? ['arm64'] : ['x64', 'x86'];

  const possiblePaths = [
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Tools\\MSVC',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\VC\\Tools\\MSVC',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\VC\\Tools\\MSVC',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Tools\\MSVC',
    'C:\\Program Files\\Microsoft Visual Studio\\2019\\Community\\VC\\Tools\\MSVC',
    'C:\\Program Files\\Microsoft Visual Studio\\2019\\Professional\\VC\\Tools\\MSVC',
    'C:\\Program Files\\Microsoft Visual Studio\\2019\\Enterprise\\VC\\Tools\\MSVC',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools\\VC\\Tools\\MSVC'
  ];

  for (const basePath of possiblePaths) {
    if (!fs.existsSync(basePath)) continue;

    try {
      const versions = fs.readdirSync(basePath);
      for (const version of versions) {
        // Check for any of the required architectures
        for (const spectreArch of spectreArchs) {
          const spectrePath = path.join(basePath, version, 'lib', 'spectre', spectreArch);
          if (fs.existsSync(spectrePath)) {
            // Check if directory has files
            const files = fs.readdirSync(spectrePath);
            if (files.length > 0) {
              return true;
            }
          }
        }
      }
    } catch {}
  }

  return false;
}

function getWindowsArch() {
  // Detect Windows architecture
  const arch = process.arch;
  if (arch === 'arm64') return 'ARM64';
  if (arch === 'x64' || arch === 'ia32') return 'x64/x86';
  return 'x64/x86'; // default
}

function checkWindows(packageName) {
  // Windows - check for Visual Studio or build tools
  const hasVS = checkVisualStudio();
  const hasPython = commandExists('python') || commandExists('python3');
  const hasSpectre = hasVS ? checkSpectreLibs() : false;
  const arch = getWindowsArch();

  // If ANY check fails - show full instructions and block
  if (!hasVS || !hasPython || !hasSpectre) {
    console.error('\n\n');
    console.error(colorize('╔════════════════════════════════════════════════════════════════╗', COLORS.red));
    console.error(colorize('║  ❌ INSTALLATION BLOCKED - Missing Build Tools                 ║', COLORS.red));
    console.error(colorize('╚════════════════════════════════════════════════════════════════╝', COLORS.red));
    console.error('\n' + colorize('Termly CLI cannot install without required components.', COLORS.bold));
    console.error('\nMissing components:');
    if (!hasVS) console.error(colorize('  ✗ Visual Studio 2019/2022', COLORS.red));
    if (!hasPython) console.error(colorize('  ✗ Python 3.x', COLORS.red));
    if (hasVS && !hasSpectre) console.error(colorize('  ✗ Spectre-mitigated libraries', COLORS.red));

    console.error('\n' + colorize('═══════════════════════════════════════════════════════════════', COLORS.cyan));
    console.error(colorize('SETUP INSTRUCTIONS:', COLORS.bold));
    console.error(colorize('═══════════════════════════════════════════════════════════════', COLORS.cyan));

    console.error('\n' + colorize('STEP 1: Install/Modify Visual Studio 2022', COLORS.cyan));
    console.error('\n  If you already have VS installed:');
    console.error('    • Open ' + colorize('Visual Studio Installer', COLORS.yellow));
    console.error('    • Click ' + colorize('Modify', COLORS.yellow) + ' on your installation');
    console.error('    • Go to ' + colorize('Workloads', COLORS.yellow) + ' tab');
    console.error('    • Check: ' + colorize('Desktop development with C++', COLORS.yellow));
    console.error('    • Go to ' + colorize('Individual Components', COLORS.yellow) + ' tab');
    console.error('    • Search: ' + colorize('"Spectre"', COLORS.yellow));
    console.error('    • Check: ' + colorize(`MSVC C++ ${arch} Spectre-mitigated libs (Latest)`, COLORS.yellow));
    console.error('    • Check: ' + colorize('Windows SDK (any recent version)', COLORS.yellow));
    console.error('    • Click ' + colorize('Modify', COLORS.yellow));

    console.error('\n  If you don\'t have VS installed:');
    console.error('    • Download: ' + colorize('https://visualstudio.microsoft.com/downloads/', COLORS.yellow));
    console.error('    • Run installer');
    console.error('    • Select: ' + colorize('Desktop development with C++', COLORS.yellow));
    console.error('    • In Individual Components, ensure:');
    console.error('      - ' + colorize(`MSVC C++ ${arch} build tools`, COLORS.yellow));
    console.error('      - ' + colorize(`MSVC C++ ${arch} Spectre-mitigated libs`, COLORS.yellow));
    console.error('      - ' + colorize('Windows SDK', COLORS.yellow));

    console.error('\n' + colorize('STEP 2: Install Python (if missing)', COLORS.cyan));
    console.error('    • Download: ' + colorize('https://www.python.org/downloads/', COLORS.yellow));
    console.error('    • Install Python 3.x');
    console.error('    • Check "Add to PATH" during installation');

    console.error('\n' + colorize('STEP 3: Restart your terminal', COLORS.cyan));
    console.error('    • Close this command prompt/PowerShell window');
    console.error('    • Open a NEW window');

    console.error('\n' + colorize('STEP 4: Retry installation', COLORS.cyan));
    console.error('    ' + colorize(`npm install -g ${packageName}`, COLORS.yellow));

    console.error('\n' + colorize('═══════════════════════════════════════════════════════════════', COLORS.cyan));
    console.error('');

    process.exit(1);
  }

  // All checks passed
  console.log('\n' + colorize('✓ Windows Build Tools Check Passed', COLORS.cyan));
  console.log(colorize('  ✓ Visual Studio found', COLORS.cyan));
  console.log(colorize('  ✓ Python found', COLORS.cyan));
  console.log(colorize('  ✓ Spectre-mitigated libraries found', COLORS.cyan));
  console.log('');
}

// Detect package name from package.json
function getPackageName() {
  try {
    const fs = require('fs');
    const path = require('path');
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.name || '@termly-dev/cli';
  } catch {
    return '@termly-dev/cli';
  }
}

// Main
const currentPlatform = platform();
const packageName = getPackageName();

console.log(colorize('\n🔧 Checking build requirements...', COLORS.cyan));

if (currentPlatform === 'linux') {
  checkLinux(packageName);
} else if (currentPlatform === 'darwin') {
  checkMacOS();
} else if (currentPlatform === 'win32') {
  checkWindows(packageName);
} else {
  // Unknown platform - just pass through
  console.log(colorize('⚠️  Unknown platform - skipping checks\n', COLORS.yellow));
}

process.exit(0);
