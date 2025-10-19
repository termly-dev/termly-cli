const fs = require('fs');
const path = require('path');
const os = require('os');
const { isPidAlive } = require('../utils/pid');
const logger = require('../utils/logger');

const TERMLY_DIR = path.join(os.homedir(), '.termly');
const SESSIONS_FILE = path.join(TERMLY_DIR, 'sessions.json');

// Ensure .termly directory exists
function ensureTermlyDir() {
  if (!fs.existsSync(TERMLY_DIR)) {
    fs.mkdirSync(TERMLY_DIR, { recursive: true });
  }
}

// Load sessions registry from file
function loadSessionsRegistry() {
  ensureTermlyDir();

  if (!fs.existsSync(SESSIONS_FILE)) {
    return { sessions: [] };
  }

  try {
    const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const registry = JSON.parse(data);

    // Validate PIDs and update status
    if (registry.sessions) {
      registry.sessions = registry.sessions.map(session => {
        if (session.status === 'running' && !isPidAlive(session.pid)) {
          logger.debug(`Session ${session.sessionId} PID ${session.pid} is dead, marking as stopped`);
          session.status = 'stale';
        }
        return session;
      });
    }

    return registry;
  } catch (err) {
    logger.error(`Failed to load sessions registry: ${err.message}`);
    return { sessions: [] };
  }
}

// Save sessions registry to file
function saveSessionsRegistry(registry) {
  ensureTermlyDir();

  try {
    const data = JSON.stringify(registry, null, 2);
    fs.writeFileSync(SESSIONS_FILE, data, 'utf8');
    logger.debug('Sessions registry saved');
  } catch (err) {
    logger.error(`Failed to save sessions registry: ${err.message}`);
  }
}

// Add session to registry
function addSession(session) {
  const registry = loadSessionsRegistry();
  registry.sessions.push(session);
  saveSessionsRegistry(registry);
  logger.info(`Session ${session.sessionId} added to registry`);
}

// Update session in registry
function updateSession(sessionId, updates) {
  const registry = loadSessionsRegistry();
  const index = registry.sessions.findIndex(s => s.sessionId === sessionId);

  if (index !== -1) {
    registry.sessions[index] = { ...registry.sessions[index], ...updates };
    saveSessionsRegistry(registry);
    logger.debug(`Session ${sessionId} updated`);
    return true;
  }

  return false;
}

// Remove session from registry
function removeSession(sessionId) {
  const registry = loadSessionsRegistry();
  const initialLength = registry.sessions.length;
  registry.sessions = registry.sessions.filter(s => s.sessionId !== sessionId);

  if (registry.sessions.length < initialLength) {
    saveSessionsRegistry(registry);
    logger.info(`Session ${sessionId} removed from registry`);
    return true;
  }

  return false;
}

// Get session by ID
function getSessionById(sessionId) {
  const registry = loadSessionsRegistry();
  return registry.sessions.find(s => s.sessionId === sessionId);
}

// Get session by directory
function getSessionByDirectory(workingDir) {
  const registry = loadSessionsRegistry();
  return registry.sessions.find(
    s => s.workingDir === workingDir && s.status === 'running'
  );
}

// Get all running sessions
function getRunningSessions() {
  const registry = loadSessionsRegistry();
  return registry.sessions.filter(s => s.status === 'running');
}

// Get all sessions
function getAllSessions() {
  const registry = loadSessionsRegistry();
  return registry.sessions;
}

// Get stale sessions (marked as running but PID is dead)
function getStaleSessions() {
  const registry = loadSessionsRegistry();
  return registry.sessions.filter(s => s.status === 'stale');
}

// Remove stale sessions
function removeStaleSessions() {
  const registry = loadSessionsRegistry();
  const staleSessions = registry.sessions.filter(s => s.status === 'stale');
  registry.sessions = registry.sessions.filter(s => s.status !== 'stale');
  saveSessionsRegistry(registry);
  return staleSessions.length;
}

module.exports = {
  loadSessionsRegistry,
  saveSessionsRegistry,
  addSession,
  updateSession,
  removeSession,
  getSessionById,
  getSessionByDirectory,
  getRunningSessions,
  getAllSessions,
  getStaleSessions,
  removeStaleSessions,
  SESSIONS_FILE
};
