// Gestion de los usuarios por parte de  la api

// Funciones importantes:
//  - validateTimerState - Valida y normaliza el estado del timer
//  - listUserDirectories - Saca todos los usuarios que tienen directorio en database
//  - addUserToList - Añade un usuario a la lista persistente
//  - getPersistentUsers - Saca un array con todos los usuarios

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

// saca un array con todos los usuarios que tienen un directorio en database
export async function listUserDirectories() {
  try {
    const entries = await fs.readdir(USERS_DATA_DIR, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
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

// Saca el array de todos los usuarios en el servidor
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

