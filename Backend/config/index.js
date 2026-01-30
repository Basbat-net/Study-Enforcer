// los parametros principales del servidor
// creo que hay cosas que hay que cambiar y por eso la app está rota pero por
// ahora ahí se queda

import path from 'path';
import { fileURLToPath } from 'url';

// ES Module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
export { ROOT_DIR };

// Server configuration
export const PORT = 3000;

// CORS configuration - local only
export const CORS_OPTIONS = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

// Database folder: all user and app data live here
export const DATABASE_DIR = path.join(ROOT_DIR, 'Database');
export const USERS_DATA_DIR = path.join(DATABASE_DIR, 'users');
export const USERS_FILE = path.join(DATABASE_DIR, 'users.json');
export const INACTIVE_INTERVALS_FILE = path.join(DATABASE_DIR, 'inactive_intervals.json');

/** Path to a user's logs file: Database/users/{username}/logs.json */
export function getLogsPath(username) {
  return path.join(USERS_DATA_DIR, username, 'logs.json');
}

/** Path to a user's timer state file: Database/users/{username}/timer_state.json */
export function getTimerStatePath(username) {
  return path.join(USERS_DATA_DIR, username, 'timer_state.json');
}

/** Path to a user's directory: Database/users/{username} */
export function getUserDir(username) {
  return path.join(USERS_DATA_DIR, username);
}

// Lock options for file operations (using proper-lockfile)
export const LOCK_OPTIONS = {
  stale: 30000, // After 30s the lock file is considered stale
  update: 2000, // For long operations, update lock file every 2s
  retries: {
    retries: 10,
    factor: 2, // Exponential backoff: 100ms, 200ms, etc.
    minTimeout: 100,
    maxTimeout: 2500,
    randomize: true,
  }
};

