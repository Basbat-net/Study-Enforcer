// Gestiona los logs de actividad del usuario que se modifican desde el frontend

// Router mount point: /api/logs/
// Api calls:
// - GET /:username - Obtiene todos los logs del usuario
// - POST /:username - Sobrescribe todos los logs del usuario
// - POST /:username/add - Añade un log al usuario con append (no sobreescribe)
// - DELETE /:username - Borra todos los logs del usuario

// Nota para el futuro: Cuando llamas el method, eso se define en el router.cosa
// ej: router.get , router.port, router.delete, etc

import { Router } from 'express';
import { getLogsPath } from '../config/index.js';
import { readLogsFromFile, appendLog, writeLogsToFile } from '../services/logService.js';
import { safeDeleteFile } from '../utils/fileUtils.js';

const router = Router();//  /api/logs/

// GET /api/logs/:username
// Obtiene todos los logs del usuario
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const filePath = getLogsPath(username);
    
    console.log(`[LogsRoutes] Attempting to read logs for user: ${username}`);
    const logs = await readLogsFromFile(filePath);
    console.log(`[LogsRoutes] Successfully read ${logs.length} logs for user: ${username}`);
    // devolvemos los logs en formato json 
    res.json(logs);
  }
  catch (error) {
    console.error('[LogsRoutes] Error reading logs:', error);
    res.status(500).json({ error: 'Error reading logs' });
  }
});


// POST /api/logs/:username
// Guarda/sobrescribe todos los logs del usuario
router.post('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const logs = req.body;
    const filePath = getLogsPath(username);
    await writeLogsToFile(filePath, logs);
    res.json({ success: true });
  } catch (error) {
    console.error('[LogsRoutes] Error saving logs:', error);
    res.status(500).json({ error: 'Error saving logs' });
  }
});


// POST /api/logs/:username/add
// Añade un log al usuario con append
router.post('/:username/add', async (req, res) => {
  try {
    const { username } = req.params;
    const newLog = req.body;
    const filePath = getLogsPath(username);
    
    // Append al log y ya
    await appendLog(filePath, newLog);
    res.json({ success: true });
  } catch (error) {
    console.error('[LogsRoutes] Error appending log:', error);
    res.status(500).json({ error: 'Error appending log' });
  }
});


// DELETE /api/logs/:username
// Borra todos los logs del usuario
router.delete('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const filePath = getLogsPath(username);
    await safeDeleteFile(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('[LogsRoutes] Error clearing logs:', error);
    res.status(500).json({ error: 'Error clearing logs' });
  }
});

export default router;
