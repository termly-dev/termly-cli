#!/usr/bin/env node

/**
 * Standalone test script to check Windows build tools
 * Run with: node test-windows-build-tools.js
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
console.log(colorize('TERMLY CLI - Windows Build Tools Test', COLORS.bold));
console.log(colorize('='.repeat(70), COLORS.cyan) + '\n');

const possiblePaths = [
  'C:\\Program Files\\Microsoft Visual Studio\\2022',
  'C:\\Program Files\\Microsoft Visual Studio\\2019',
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022',
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019'
];

let vsInstalled = false;
let msvcInstalled = false;
let vsPath = null;
let msvcVersion = null;

console.log(colorize('Checking for Visual Studio...', COLORS.cyan));

for (const basePath of possiblePaths) {
  console.log(`\n  Checking: ${basePath}`);

  if (!fs.existsSync(basePath)) {
    console.log(colorize('    ✗ Path does not exist', COLORS.red));
    continue;
  }

  console.log(colorize('    ✓ Path exists', COLORS.green));

  const editions = ['Community', 'Professional', 'Enterprise', 'BuildTools'];

  for (const edition of editions) {
    const editionPath = path.join(basePath, edition);
    console.log(`\n    Checking edition: ${edition}`);

    if (fs.existsSync(editionPath)) {
      vsInstalled = true;
      vsPath = editionPath;
      console.log(colorize(`      ✓ ${edition} found`, COLORS.green));

      const msvcPath = path.join(editionPath, 'VC', 'Tools', 'MSVC');
      console.log(`      Checking MSVC path: ${msvcPath}`);

      if (fs.existsSync(msvcPath)) {
        console.log(colorize('        ✓ MSVC folder exists', COLORS.green));

        try {
          const versions = fs.readdirSync(msvcPath);
          console.log(`        Found versions: ${versions.join(', ')}`);

          for (const version of versions) {
            console.log(`\n        Checking version: ${version}`);

            const compilerX64 = path.join(msvcPath, version, 'bin', 'Hostx64', 'x64', 'cl.exe');
            const compilerX86 = path.join(msvcPath, version, 'bin', 'Hostx86', 'x86', 'cl.exe');

            console.log(`          Looking for: ${compilerX64}`);
            const hasX64 = fs.existsSync(compilerX64);
            console.log(`          x64 compiler: ${hasX64 ? colorize('✓ FOUND', COLORS.green) : colorize('✗ NOT FOUND', COLORS.red)}`);

            console.log(`          Looking for: ${compilerX86}`);
            const hasX86 = fs.existsSync(compilerX86);
            console.log(`          x86 compiler: ${hasX86 ? colorize('✓ FOUND', COLORS.green) : colorize('✗ NOT FOUND', COLORS.red)}`);

            if (hasX64 || hasX86) {
              msvcInstalled = true;
              msvcVersion = version;
              console.log(colorize(`\n        ✓✓✓ MSVC TOOLSET FOUND! ✓✓✓`, COLORS.green));
              break;
            } else {
              console.log(colorize(`          ✗ No compiler found in this version`, COLORS.red));
            }
          }

          if (msvcInstalled) break;
        } catch (err) {
          console.log(colorize(`        ✗ Error reading MSVC path: ${err.message}`, COLORS.red));
        }
      } else {
        console.log(colorize('        ✗ MSVC folder does not exist', COLORS.red));
      }
    } else {
      console.log(colorize(`      ✗ ${edition} not found`, COLORS.red));
    }
  }

  if (msvcInstalled) break;
}

console.log('\n' + colorize('='.repeat(70), COLORS.cyan));
console.log(colorize('RESULTS:', COLORS.bold));
console.log(colorize('='.repeat(70), COLORS.cyan) + '\n');

console.log(`Visual Studio Installed: ${vsInstalled ? colorize('✓ YES', COLORS.green) : colorize('✗ NO', COLORS.red)}`);
if (vsPath) console.log(`  Path: ${vsPath}`);

console.log(`\nMSVC Toolset Installed: ${msvcInstalled ? colorize('✓ YES', COLORS.green) : colorize('✗ NO', COLORS.red)}`);
if (msvcVersion) console.log(`  Version: ${msvcVersion}`);

if (!msvcInstalled) {
  console.log('\n' + colorize('='.repeat(70), COLORS.red));
  console.log(colorize('PROBLEM DETECTED: MSVC Toolset Missing', COLORS.bold));
  console.log(colorize('='.repeat(70), COLORS.red) + '\n');

  console.log('You need to install the C++ build tools:');
  console.log('');
  console.log('1. Open Visual Studio Installer');
  console.log('2. Click "Modify" on your VS 2022 installation');
  console.log('3. Go to "Workloads" tab');
  console.log('4. Check: ' + colorize('Desktop development with C++', COLORS.yellow));
  console.log('5. Click "Modify" to install');
  console.log('');
  console.log('This will install the MSVC compiler (cl.exe) that is required');
  console.log('for building native Node.js modules like node-pty.');
  console.log('');
} else {
  console.log('\n' + colorize('✓ All build tools are present!', COLORS.green));
}

console.log('\n' + colorize('='.repeat(70), COLORS.cyan) + '\n');
