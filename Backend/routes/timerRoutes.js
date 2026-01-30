// Endpoint api para gestionar los estados del timer del usuario

// Router mount point: /api/timer-state/
// Api calls:
// - GET /:username - Obtiene el estado del timer del usuario
// - POST /:username - Guarda el estado del timer del usuario
// - DELETE /:username - Borra el estado del timer del usuario

import { Router } from 'express';
import { getTimerStatePath } from '../config/index.js';
import { ensureFileExists, safeReadJson, safeWriteJson, safeDeleteFile } from '../utils/fileUtils.js';
import { validateTimerState, DEFAULT_TIMER_STATE } from '../services/userService.js';

const router = Router(); //  /api/timer-state/

// GET /api/timer-state/:username
// Devuelve el json del timerState
router.get('/:username', async (req, res) => {
  const { username } = req.params;
  const filePath = getTimerStatePath(username);
  
  try {
    await ensureFileExists(filePath, '{}');
    const state = await safeReadJson(filePath);
    
    if (state && typeof state === 'object') {
      // Se valida el estado del timer de formato y cosas
      res.json(validateTimerState(state));
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('[TimerRoutes] Error reading timer state:', error);
    res.json({ ...DEFAULT_TIMER_STATE, lastUpdate: Date.now() });
  }
});


// POST /api/timer-state/:username
// Guarda el estado del timer del usuario con write!!!
router.post('/:username', async (req, res) => {
  const { username } = req.params;
  const filePath = getTimerStatePath(username);
  
  try {
    const validState = validateTimerState(req.body);
    await safeWriteJson(filePath, validState);
    res.json({ success: true, state: validState });
  } catch (error) {
    console.error('[TimerRoutes] Error saving timer state:', error);
    res.status(500).json({ 
      error: 'Error saving timer state',
      details: error.message
    });
  }
});


// DELETE /api/timer-state/:username
// Borra el estado del timer del usuario
router.delete('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const filePath = getTimerStatePath(username);
    
    await safeDeleteFile(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('[TimerRoutes] Error clearing timer state:', error);
    res.status(500).json({ error: 'Error clearing timer state' });
  }
});

export default router;
