'use strict';

let logLevel = 'info';

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4
};

const shouldLog = (level) => {
  return levels[level] >= levels[logLevel];
};

export const setLogLevel = (level) => {
  if (levels[level] !== undefined) {
    logLevel = level;
  }
};

export const debug = (message, ...args) => {
  if (shouldLog('debug')) {
    console.log(`[API-Guard][DEBUG] ${message}`, ...args);
  }
};

export const info = (message, ...args) => {
  if (shouldLog('info')) {
    console.log(`[API-Guard][INFO] ${message}`, ...args);
  }
};

export const warn = (message, ...args) => {
  if (shouldLog('warn')) {
    console.warn(`[API-Guard][WARN] ${message}`, ...args);
  }
};

export const error = (message, ...args) => {
  if (shouldLog('error')) {
    console.error(`[API-Guard][ERROR] ${message}`, ...args);
  }
};

module.exports = {
  setLogLevel,
  debug,
  info,
  warn,
  error
};
