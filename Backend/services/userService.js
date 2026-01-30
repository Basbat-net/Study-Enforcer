// Gestion de los usuarios por parte de  la api

// Funciones importantes:
//  - validateTimerState - Valida y normaliza el estado del timer
//  - listUserDirectories - Lista los directorios de los usuarios
//  - migrateExistingUsers - (no se que hace)
//  - addUserToList - Añade un usuario a la lista persistente
//  - getPersistentUsers - (no se que hace)

import fs from 'fs/promises';
import { USERS_FILE, USERS_DATA_DIR } from '../config/index.js';
import { ensureFileExists, safeReadJson, safeWriteJson } from '../utils/fileUtils.js';

// Default timer state
export const DEFAULT_TIMER_STATE = {
  time: 0,
  lastUpdate: Date.now(),
  wasPaused: true,
  wasRunning: false,
  isActiveTrackingMode: true
};

// Asegura que el formato está bien
export function validateTimerState(state) {
  return {
    time: typeof state?.time === 'number' ? state.time : 0,
    lastUpdate: typeof state?.lastUpdate === 'number' ? state.lastUpdate : Date.now(),
    wasPaused: Boolean(state?.wasPaused),
    wasRunning: Boolean(state?.wasRunning),
    isActiveTrackingMode: state?.isActiveTrackingMode !== undefined ? Boolean(state.isActiveTrackingMode) : true
  };
}

// saca todos los directorios para cada usuario
export async function listUserDirectories() {
  try {
    const entries = await fs.readdir(USERS_DATA_DIR, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

// esto no se muy bien que hace
export async function migrateExistingUsers() {
  try {
    console.log('[UserService] Migrating existing users to persistent list...');
    const dirUsers = await listUserDirectories();
    for (const username of dirUsers) {
      await addUserToList(username);
    }
    console.log(`[UserService] Migration complete. Found ${dirUsers.length} existing users.`);
  } catch (error) {
    console.error('[UserService] Error during user migration:', error);
  }
}

// añade usuario a la lista
export async function addUserToList(username) {
  try {
    await ensureFileExists(USERS_FILE, '[]');
    const users = await safeReadJson(USERS_FILE) || [];
    if (!users.includes(username)) {
      users.push(username);
      users.sort();
      await safeWriteJson(USERS_FILE, users);
      console.log(`[UserService] Added user ${username} to persistent user list`);
    }
  } catch (error) {
    console.error(`[UserService] Error adding user ${username} to list:`, error);
  }
}

// esto tampoco se muy bien que hace
export async function getPersistentUsers() {
  try {
    await ensureFileExists(USERS_FILE, '[]');
    const users = await safeReadJson(USERS_FILE) || [];
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error('[UserService] Error reading persistent user list:', error);
    return [];
  }
}

