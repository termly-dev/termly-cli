// Check if process with PID exists
function isPidAlive(pid) {
  if (!pid || typeof pid !== 'number') {
    return false;
  }

  try {
    // Signal 0 checks if process exists without sending actual signal
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
}

// Kill process by PID
function killProcess(pid, signal = 'SIGTERM') {
  if (!pid || typeof pid !== 'number') {
    throw new Error('Invalid PID');
  }

  try {
    process.kill(pid, signal);
    return true;
  } catch (err) {
    return false;
  }
}

// Kill process gracefully with timeout
async function killProcessGracefully(pid, timeout = 5000) {
  if (!isPidAlive(pid)) {
    return { success: true, method: 'already_dead' };
  }

  // Send SIGTERM
  killProcess(pid, 'SIGTERM');

  // Wait for process to exit
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (!isPidAlive(pid)) {
      return { success: true, method: 'SIGTERM' };
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Force kill if still alive
  if (isPidAlive(pid)) {
    killProcess(pid, 'SIGKILL');
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!isPidAlive(pid)) {
      return { success: true, method: 'SIGKILL' };
    }

    return { success: false, method: 'failed' };
  }

  return { success: true, method: 'SIGTERM' };
}

module.exports = {
  isPidAlive,
  killProcess,
  killProcessGracefully
};
