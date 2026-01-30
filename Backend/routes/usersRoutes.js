
// Enpoint para cosas de los usuarios

// Router mount point: /api/users/
// Api calls:
// - GET / - Obtiene la lista de todos los usuarios
// - GET /ping - Un foking ping y ya
// - POST /init-user/:username - Inicializa un nuevo usuario
// - DELETE /user/:username - Borra un usuario

import { Router } from 'express';
import fs from 'fs/promises';
import { getLogsPath, getTimerStatePath, getUserDir, USERS_FILE } from '../config/index.js';
import { ensureFileExists, safeWriteJson } from '../utils/fileUtils.js';
import { addUserToList, getPersistentUsers, listUserDirectories, DEFAULT_TIMER_STATE } from '../services/userService.js';

const router = Router();


// GET /api/users
// return de todos los usuarios
router.get('/', async (req, res) => {
  try {
    const [persistentUsers, dirUsers] = await Promise.all([
      getPersistentUsers(),
      listUserDirectories()
    ]);
    
    const users = new Set([...persistentUsers, ...dirUsers]);
    
    for (const username of dirUsers) {
      await addUserToList(username);
    }
    
    res.json(Array.from(users).sort());
  } catch (error) {
    console.error('[UsersRoutes] Error getting users:', error);
    res.status(500).json({ error: 'Error getting users' });
  }
});


// GET /api/ping
// ping
router.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});


// POST /api/init-user/:username
// inicializa un nuevo usuario
router.post('/init-user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    await addUserToList(username);
    
    const logFilePath = getLogsPath(username);
    const timerStateFilePath = getTimerStatePath(username);
    await fs.mkdir(getUserDir(username), { recursive: true });
    await ensureFileExists(logFilePath, '');
    const defaultState = { ...DEFAULT_TIMER_STATE, lastUpdate: Date.now() };
    await ensureFileExists(timerStateFilePath, JSON.stringify(defaultState, null, 2));
    
    console.log(`[UsersRoutes] Initialized files for user: ${username}`);
    res.json({ 
      success: true, 
      message: `User ${username} initialized successfully`,
      files: {
        logFile: logFilePath,
        timerStateFile: timerStateFilePath
      }
    });
  } catch (error) {
    console.error('[UsersRoutes] Error initializing user:', error);
    res.status(500).json({ error: 'Error initializing user files' });
  }
});

//  DELETE /api/user/:username
// Borra el usuario y todo lo que respecte a él
router.delete('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    try {
      await fs.rm(getUserDir(username), { recursive: true });
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('[UsersRoutes] Error removing user dir:', error);
    }
    
    // Remove from persistent user list
    try {
      const users = await getPersistentUsers();
      const updatedUsers = users.filter(u => u !== username);
      await safeWriteJson(USERS_FILE, updatedUsers);
      console.log(`[UsersRoutes] Removed user ${username} from persistent list`);
    } catch (error) {
      console.error('[UsersRoutes] Error removing user from persistent list:', error);
    }
    
    res.json({ success: true, message: `User ${username} completely removed` });
  } catch (error) {
    console.error('[UsersRoutes] Error removing user:', error);
    res.status(500).json({ error: 'Error removing user' });
  }
});

export default router;
