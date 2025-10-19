const fs = require('fs');
const path = require('path');

// Validate directory exists
function validateDirectory(dirPath) {
  if (!dirPath) {
    return { valid: false, error: 'Directory path is required' };
  }

  const resolvedPath = path.resolve(dirPath);

  if (!fs.existsSync(resolvedPath)) {
    return {
      valid: false,
      error: `Directory does not exist: ${resolvedPath}`
    };
  }

  const stats = fs.statSync(resolvedPath);
  if (!stats.isDirectory()) {
    return {
      valid: false,
      error: `Path is not a directory: ${resolvedPath}`
    };
  }

  return { valid: true, path: resolvedPath };
}

// Validate URL
function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Validate session ID format
function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  // UUID format
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
}

// Validate pairing code format (ABC-123)
function validatePairingCode(code) {
  if (!code || typeof code !== 'string') {
    return false;
  }
  return /^[A-Z0-9]{3}-[A-Z0-9]{3}$/i.test(code);
}

module.exports = {
  validateDirectory,
  validateUrl,
  validateSessionId,
  validatePairingCode
};
