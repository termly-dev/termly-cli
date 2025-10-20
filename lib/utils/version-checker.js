const axios = require('axios').default || require('axios');
const chalk = require('chalk');
const semver = require('semver');
const { getApiUrl } = require('../config/environment');
const logger = require('./logger');

// Get package info (name and version)
function getPackageInfo() {
  try {
    const pkg = require('../../package.json');
    return {
      name: pkg.name,
      version: pkg.version
    };
  } catch (err) {
    logger.error(`Failed to read package.json: ${err.message}`);
    return null;
  }
}

// Check CLI version against minimum required version
async function checkVersion() {
  const packageInfo = getPackageInfo();

  if (!packageInfo) {
    logger.debug('Could not determine package info, skipping version check');
    return;
  }

  const apiUrl = getApiUrl();
  const url = `${apiUrl}/api/cli/version`;

  logger.debug(`Checking version: ${packageInfo.name}@${packageInfo.version}`);

  try {
    const response = await axios.get(url, {
      params: {
        platform: 'node',
        currentVersion: packageInfo.version,
        package: packageInfo.name
      },
      headers: {
        'X-API-Type': 'cli'
      },
      timeout: 5000 // 5 second timeout
    });

    const { minVersion, updateCommand } = response.data;

    logger.debug(`Server minVersion: ${minVersion}`);

    // Compare versions
    if (semver.valid(packageInfo.version) && semver.valid(minVersion)) {
      if (semver.lt(packageInfo.version, minVersion)) {
        // Current version is less than minimum required
        console.error('');
        console.error(chalk.red('❌ ERROR: Termly CLI is outdated and no longer supported'));
        console.error('');
        console.error(chalk.gray(`   Current version: ${packageInfo.version}`));
        console.error(chalk.gray(`   Minimum required: ${minVersion}`));
        console.error('');
        console.error(chalk.yellow(`   Update now:`));
        console.error(chalk.cyan(`   ${updateCommand}`));
        console.error('');
        console.error(chalk.red('Cannot start session with outdated version.'));
        console.error('');
        process.exit(1);
      }

      logger.debug('Version check passed');
    } else {
      logger.debug('Invalid semver format, skipping version comparison');
    }
  } catch (err) {
    // Network error or server unavailable - skip check silently
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      logger.debug('Network error during version check, skipping');
      return;
    }

    // Log other errors but don't block
    logger.debug(`Version check failed: ${err.message}`);
  }
}

module.exports = {
  checkVersion,
  getPackageInfo
};
