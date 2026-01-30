// Gestiona los intervalos de inactividad, tanto inicio como final

// Router mount point: /api/inactive-interval/
// Api calls:
// - /start/:username - Empieza el intervalo de inactividad para ese usuario
// - /end/:username - Finaliza el intervalo de inactividad para ese usuario

import { Router } from 'express';
import { getLogsPath, INACTIVE_INTERVALS_FILE } from '../config/index.js';
import { safeReadJson, safeWriteJson } from '../utils/fileUtils.js';
import { appendLog } from '../services/logService.js';

// El router se monta en /api/inactive-interval/, asi que todos los calls que 
// empiezen por ahi van a este router
const router = Router();

// POST /api/inactive-interval/start/:username
router.post('/start/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { timestamp } = req.body;
    // leemos el archivo de intervalos de inactividad
    const intervals = await safeReadJson(INACTIVE_INTERVALS_FILE) || {};
    
    // añadimos el intervalo de inactividad para ese usuario
    intervals[username] = {
      startTime: timestamp,
      isActive: true
    };
    // escribimos el archivo de intervalos de inactividad
    // IMPORTANTE: como es json hay que reescribir, no se puede append
    await safeWriteJson(INACTIVE_INTERVALS_FILE, intervals);
    res.json({ success: true });
  } catch (error) {
    console.error('[IntervalRoutes] Error starting inactive interval:', error);
    res.status(500).json({ error: 'Error starting inactive interval' });
  }
});


// POST /api/inactive-interval/end/:username
router.post('/end/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { currentTime } = req.body;
    
    // leemos el archivo de intervalos de inactividad
    const intervals = await safeReadJson(INACTIVE_INTERVALS_FILE) || {};
    
    const pendingInterval = intervals[username];
    let inactiveLog = null;
    // vemos a ver si hay un intervalo de inactividad pendiente y si está activo
    if (pendingInterval && pendingInterval.isActive) {
      const duration = currentTime - pendingInterval.startTime;
      
      if (duration > 0) {
        inactiveLog = {
          type: 'inactive',
          duration: duration,
          timestamp: pendingInterval.startTime,
          endTimestamp: currentTime,
          username: username
        };
        
        // lo metemos a los logs del usuario con append (esto no reescribe)
        const userLogsPath = getLogsPath(username);
        // IMPORTANTE: como es el backend, aqui no tiramos de api, llamamos al service directamente
        await appendLog(userLogsPath, inactiveLog);
      }
      
      // borramos el intervalo de inactividad pendiente
      delete intervals[username];
      await safeWriteJson(INACTIVE_INTERVALS_FILE, intervals);
    }
    
    res.json({ 
      success: true, 
      inactiveLog,
      hadPendingInterval: !!pendingInterval?.isActive
    });
  } catch (error) {
    console.error('[IntervalRoutes] Error ending inactive interval:', error);
    res.status(500).json({ error: 'Error ending inactive interval' });
  }
});

export default router;
