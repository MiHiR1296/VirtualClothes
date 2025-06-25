// Logging utility with adjustable log levels

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

function parseLevel(name) {
  if (!name) return LEVELS.info;
  const level = String(name).toLowerCase();
  return LEVELS[level] ?? LEVELS.info;
}

function getCurrentLevel() {
  if (typeof window !== 'undefined' && window.LOG_LEVEL !== undefined) {
    return parseLevel(window.LOG_LEVEL);
  }
  if (typeof import.meta !== 'undefined') {
    return parseLevel(import.meta.env?.VITE_LOG_LEVEL);
  }
  return LEVELS.info;
}

export function setLogLevel(level) {
  if (typeof window !== 'undefined') {
    window.LOG_LEVEL = level;
  }
}

export function logDebug(...args) {
  if (getCurrentLevel() <= LEVELS.debug) {
    console.debug(...args);
  }
}

export function logInfo(...args) {
  if (getCurrentLevel() <= LEVELS.info) {
    console.info(...args);
  }
}

export function logWarn(...args) {
  if (getCurrentLevel() <= LEVELS.warn) {
    console.warn(...args);
  }
}

export function logError(...args) {
  if (getCurrentLevel() <= LEVELS.error) {
    console.error(...args);
  }
}

