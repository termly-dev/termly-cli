#!/usr/bin/env node

/**
 * Test for Spectre libraries and Windows SDK
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function colorize(text, color) {
  return `${color}${text}${COLORS.reset}`;
}

console.log('\n' + colorize('='.repeat(70), COLORS.cyan));
console.log(colorize('CHECKING SPECTRE LIBRARIES & WINDOWS SDK', COLORS.bold));
console.log(colorize('='.repeat(70), COLORS.cyan) + '\n');

const vsPath = 'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community';
const msvcVersion = '14.44.35207';
const msvcPath = path.join(vsPath, 'VC', 'Tools', 'MSVC', msvcVersion);

console.log('Checking Spectre-mitigated libraries...\n');

const spectreArchs = ['x64', 'x86', 'arm64'];
let spectreFound = false;

for (const arch of spectreArchs) {
  const spectrePath = path.join(msvcPath, 'lib', 'spectre', arch);
  console.log(`  ${arch}: ${spectrePath}`);

  if (fs.existsSync(spectrePath)) {
    try {
      const files = fs.readdirSync(spectrePath);
      if (files.length > 0) {
        console.log(colorize(`    ✓ Found (${files.length} files)`, COLORS.green));
        spectreFound = true;
      } else {
        console.log(colorize('    ✗ Folder exists but empty', COLORS.red));
      }
    } catch (err) {
      console.log(colorize(`    ✗ Error: ${err.message}`, COLORS.red));
    }
  } else {
    console.log(colorize('    ✗ Not found', COLORS.red));
  }
}

console.log('\n' + colorize('-'.repeat(70), COLORS.cyan) + '\n');
console.log('Checking Windows SDK...\n');

const sdkPaths = [
  'C:\\Program Files (x86)\\Windows Kits\\10',
  'C:\\Program Files\\Windows Kits\\10'
];

let sdkFound = false;
let sdkVersions = [];

for (const sdkBase of sdkPaths) {
  console.log(`  Checking: ${sdkBase}`);

  if (fs.existsSync(sdkBase)) {
    console.log(colorize('    ✓ Path exists', COLORS.green));

    const includePath = path.join(sdkBase, 'Include');
    if (fs.existsSync(includePath)) {
      try {
        const versions = fs.readdirSync(includePath).filter(v => v.match(/^10\./));
        if (versions.length > 0) {
          sdkFound = true;
          sdkVersions = versions;
          console.log(colorize(`    ✓ Found SDK versions: ${versions.join(', ')}`, COLORS.green));
        }
      } catch (err) {
        console.log(colorize(`    ✗ Error reading: ${err.message}`, COLORS.red));
      }
    } else {
      console.log(colorize('    ✗ Include folder not found', COLORS.red));
    }
  } else {
    console.log(colorize('    ✗ Path does not exist', COLORS.red));
  }
}

console.log('\n' + colorize('='.repeat(70), COLORS.cyan));
console.log(colorize('RESULTS:', COLORS.bold));
console.log(colorize('='.repeat(70), COLORS.cyan) + '\n');

console.log(`Spectre Libraries: ${spectreFound ? colorize('✓ FOUND', COLORS.green) : colorize('✗ MISSING', COLORS.red)}`);
console.log(`Windows SDK: ${sdkFound ? colorize('✓ FOUND', COLORS.green) : colorize('✗ MISSING', COLORS.red)}`);

if (sdkVersions.length > 0) {
  console.log(`  Versions: ${sdkVersions.join(', ')}`);
}

if (!spectreFound || !sdkFound) {
  console.log('\n' + colorize('='.repeat(70), COLORS.red));
  console.log(colorize('MISSING COMPONENTS', COLORS.bold));
  console.log(colorize('='.repeat(70), COLORS.red) + '\n');

  if (!spectreFound) {
    console.log(colorize('⚠ Spectre-mitigated libraries are missing!', COLORS.yellow));
    console.log('');
    console.log('To install:');
    console.log('1. Open Visual Studio Installer');
    console.log('2. Click "Modify" on VS 2022');
    console.log('3. Go to "Individual Components" tab');
    console.log('4. Search for "Spectre"');
    console.log('5. Check: MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs (Latest)');
    console.log('6. Click "Modify"');
    console.log('');
  }

  if (!sdkFound) {
    console.log(colorize('⚠ Windows SDK is missing!', COLORS.yellow));
    console.log('');
    console.log('To install:');
    console.log('1. Open Visual Studio Installer');
    console.log('2. Click "Modify" on VS 2022');
    console.log('3. Go to "Individual Components" tab');
    console.log('4. Search for "Windows SDK"');
    console.log('5. Check: Windows 11 SDK (or Windows 10 SDK)');
    console.log('6. Click "Modify"');
    console.log('');
  }
} else {
  console.log('\n' + colorize('✓ All required components are present!', COLORS.green));
}

console.log('\n' + colorize('='.repeat(70), COLORS.cyan) + '\n');
