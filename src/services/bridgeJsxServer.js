/**
 * Storage Service
 * 
 * Service class that handles local storage operations and state management.
 * Provides methods for:
 * - User management
 * - Activity log storage
 * - Timer state persistence
 * - Local storage operations
 * 
 * Features:
 * - Local storage abstraction
 * - State management
 * - Data persistence
 * - Error handling
 * - Automatic state recovery
 */

// API base URL for server communication
const API_URL = `${window.location.origin}/api`;


export class bridgeJsxServer {
  static logOperationQueue = new Map();
  static lastKnownLogCounts = new Map();

  // CHECKED
  static async getUsers() {
    try {
      // Get users from server based on who has log files
      const response = await fetch(`${window.location.origin}/api/users`);
      if (response.ok) {
        const users = await response.json();
        return users;
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    return []; // Return empty array if no users found
  }

  // < --- LOGS --- >

  // getLogs()
  // La funcion inicial que saca los logs del servidor sin que el jsx modifique cosas
  // tambien chequea si hay logs guardados en localStorage que no se han podido enviar
  // y los intenta enviar de nuevo
    // CHECKED
  static async getLogs(username) {
    if (!username) return [];
    
    try {
      console.log(`[API] Attempting to fetch logs for user: ${username}`);
      console.log(`[API] Request URL: ${API_URL}/logs/${username}`);
      
      const response = await fetch(`${API_URL}/logs/${username}`); // la api hace un post request al server y el 
                                                                   // server le devuelve el archivo de logs completo
      console.log(`[API] Response status: ${response.status}`);
      
      // Esto es por si el post ha ido mal
      if (!response.ok) {
        console.error(`[API] Error response: ${response.status} ${response.statusText}`);
        throw new Error(`Error al obtener logs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[API] Successfully fetched ${data.length} logs for user: ${username}`);
      
      // Chequeo dentro de localStorage del navegador por si ha habido algun log guardado que no se ha enviado
      // por errores del servidor o simplemente factores adversos
      try {
        const failedLogsKey = `failed_logs_${username}`;
        // la memoria del navegador va a guardar bajo el key de failed_logs_username los logs que no se han podido enviar
        const failedLogs = JSON.parse(localStorage.getItem(failedLogsKey) || '[]');
        // intentamos acceder a ese indice en localStorage y si existe, lo guardamos en failedLogs
        if (failedLogs.length > 0) {
          console.log(`[API] Found ${failedLogs.length} failed logs in localStorage`);
          // si encuentra algo lo intenta enviar al servidor
          for (const log of failedLogs) {
            try {
              await this.addLog(username, log);
            } catch (error) {
              console.error('[API] Error recovering failed log:', error);
              continue;
            }
          }
          //limpia el failed_logs_username de localStorage
          localStorage.removeItem(failedLogsKey);
          // como se han añadido cosas se vuelve a pedir al servidor el archivo entero
          // esto posiblemente se podría mejorar pero para cuando acabe de dejarlo todo legible
          const updatedResponse = await fetch(`${API_URL}/logs/${username}`);

          if (updatedResponse.ok) {
            const updatedData = await updatedResponse.json();
            console.log(`[API] Successfully fetched ${updatedData.length} logs after recovery`);
            return updatedData;
          }
        }
      } catch (error) {
        console.error('[API] Error checking failed logs:', error);
      }
      
      // esto es donde se asigna el return de la anterior funcion
      // return data;
      
      
      const validLogs = Array.isArray(data) ? data : []; // para que una mala respuesta del post no tire un error
      
      // actualiza el conteo para cosas de que no se borren (creo)
      this.lastKnownLogCounts.set(username, validLogs.length);
      
      return validLogs;
    } 
    catch (error) {
      console.error('Error al obtener logs:', error);
      return [];
    }
  }


  // addLog()
  // Está pensado para hacer append de logs a 
  // través de una FIFO queue que basicamente encadenas 
  // "promesas" de cosas para que no haya concurrencia de escritura
  // en el archivo y no se sobreescriban cosas
  static async addLog(username, log) {
    if (!username) return;
  
    try {
      // Inicializa la cola del usuario si no existe
      if (!this.logOperationQueue.has(username)) {
        this.logOperationQueue.set(username, Promise.resolve());
      }
  
      // Añade la operación a la cola
      this.logOperationQueue.set(
        username,
        this.logOperationQueue.get(username).then(async () => {
          try {
            // Obtener logs actuales desde localStorage
            const currentLogs = await this.getLogs(username);
  
            const expectedCount = this.lastKnownLogCounts.get(username) || 0;
  
            if (currentLogs.length < expectedCount) {
              console.warn(`Log count mismatch for ${username}. Expected: ${expectedCount}, Got: ${currentLogs.length}`);
              const backupStr = localStorage.getItem(`backup_logs_${username}`);
              if (backupStr) {
                const backupLogs = JSON.parse(backupStr);
                if (backupLogs.length > currentLogs.length) {
                  console.log(`Recovering ${backupLogs.length} logs from backup`);
                  currentLogs.push(...backupLogs.slice(currentLogs.length));
                }
              }
            }
  
            // Añadir nuevo log
            currentLogs.push(log);
  
            // Guardar en localStorage como respaldo
            localStorage.setItem(`backup_logs_${username}`, JSON.stringify(currentLogs));
  
            // Intentar guardar en servidor
            try {
              const response = await fetch(`${API_URL}/logs/${username}/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(log)
              });
  
              if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
              }
  
              console.log(`[API] Log añadido exitosamente para ${username}`);
            } catch (fetchError) {
              console.warn(`[API] Falló el envío al servidor. Log guardado solo en localStorage para ${username}`);
              // Aquí ya se guardó en local, así que simplemente seguimos
            }
  
            // Actualizar contador
            this.lastKnownLogCounts.set(username, currentLogs.length);
  
            return currentLogs;
          } catch (error) {
            console.error('Error in queued log operation:', error);
            throw error;
          }
        })
      );
  
      // Esperar resolución de la operación en cola
      await this.logOperationQueue.get(username);
  
    } catch (error) {
      console.error('Error al añadir log:', error);
  
      // Intento de respaldo local en caso de error inesperado
      try {
        const currentLogs = await this.getLogs(username);
        currentLogs.push(log);
        localStorage.setItem(`backup_logs_${username}`, JSON.stringify(currentLogs));
      } catch (backupError) {
        console.error('Error guardando el log en respaldo local:', backupError);
      }
    }
  }

  


  // < --- TIMER --- >
  
  // saveTimerState()
  // Basicamente esta funcion es una manera de llamar a la api asegurandose 
  // de que los valores tienen buen formato
  // posiblemente se pueda modificar para quitar lineas de codigo

  // CHECKED
  static async saveTimerState(username, state) {
    if (!username) {
      console.warn('[API] Username is missing, cannot save timer state.');
      return;
    }
  
    try {
      const timeToSave = typeof state.time === 'number' ? state.time : 0;
  
      const validState = {
        time: timeToSave,
        lastUpdate: Number.isFinite(state.lastUpdate) ? state.lastUpdate : Date.now(),
        wasPaused: Boolean(state.wasPaused),
        wasRunning: Boolean(state.wasRunning),
        isActiveTrackingMode: state.isActiveTrackingMode !== undefined ? Boolean(state.isActiveTrackingMode) : true
      };
  
      console.log(`[API] Saving timer state for ${username}:`, validState);
  
      try {
        localStorage.setItem(`timer_state_backup_${username}`, JSON.stringify(validState));
      } catch (backupError) {
        console.error('[API] Error saving timer state backup:', backupError);
      }
  
      const response = await fetch(`${API_URL}/timer-state/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validState)
      });
  
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
  
      const result = await response.json();
      console.log(`[API] Timer state saved successfully for ${username}`);
      return result;
  
    } catch (error) {
      console.error(`[API] Error saving timer state for ${username}:`, error);
      return { success: false, error: error.message };
    }
  }

  
  // CHECKED chati
  static async getTimerState(username) {
    if (!username) return null;
  
    try {
      const response = await fetch(`${API_URL}/timer-state/${username}`);
  
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
  
      const state = await response.json();
  
      // Validación mínima para asegurar estructura válida
      if (!state || typeof state.time !== 'number') {
        throw new Error('Invalid timer state format from API');
      }
  
      const validState = {
        time: state.time,
        lastUpdate: typeof state.lastUpdate === 'number' ? state.lastUpdate : Date.now(),
        wasPaused: Boolean(state.wasPaused),
        wasRunning: Boolean(state.wasRunning),
        isActiveTrackingMode:
          state.isActiveTrackingMode !== undefined
            ? Boolean(state.isActiveTrackingMode)
            : true
      };
  
      // Backup local
      localStorage.setItem(`timer_state_backup_${username}`, JSON.stringify(validState));
  
      return validState;
  
    } catch (error) {
      console.error('[API] Error getting timer state:', error);
  
      // Intentar recuperación local
      try {
        const backupStr = localStorage.getItem(`timer_state_backup_${username}`);
        if (backupStr) {
          const backup = JSON.parse(backupStr);
          if (typeof backup.time === 'number') {
            return {
              time: backup.time,
              lastUpdate: typeof backup.lastUpdate === 'number' ? backup.lastUpdate : Date.now(),
              wasPaused: Boolean(backup.wasPaused),
              wasRunning: Boolean(backup.wasRunning),
              isActiveTrackingMode:
                backup.isActiveTrackingMode !== undefined
                  ? Boolean(backup.isActiveTrackingMode)
                  : true
            };
          }
        }
      } catch (e) {
        console.error('[API] Failed to read timer state from backup:', e);
      }
  
      // Estado seguro por defecto
      return {
        time: 0,
        lastUpdate: Date.now(),
        wasPaused: true,
        wasRunning: false,
        isActiveTrackingMode: true
      };
    }
  }

  



  // CHECKED
  static async clearTimerState(username) {
    if (!username) return;
    try {
      console.log(`[API] Clearing timer state for ${username}`);
      
      // Store current state as backup before clearing
      try {
        const currentState = await this.getTimerState(username);
        if (currentState) {
          localStorage.setItem(`timer_state_backup_${username}_pre_clear`, JSON.stringify(currentState));
        }
      } catch (backupError) {
        console.error('[API] Error creating pre-clear backup:', backupError);
      }

      const response = await fetch(`${API_URL}/timer-state/${username}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Error clearing timer state: ${response.status}`);
      }

      // Clear localStorage backup
      localStorage.removeItem(`timer_state_backup_${username}`);

      const result = await response.json();
      console.log('[API] Timer state cleared successfully');
      return result;
    } catch (error) {
      console.error('[API] Error clearing timer state:', error);
      throw error;
    }
  }




  // < --- INTERVALOS INACTIVIDAD --- >

  static async startInactiveInterval(username, timestamp) {
    try {
      console.log(`[API] Iniciando intervalo de inactividad para ${username}`);
      const response = await fetch(`${API_URL}/inactive-interval/start/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timestamp }),
      });
      if (!response.ok) {
        throw new Error(`Error al iniciar intervalo de inactividad: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[API] Error en startInactiveInterval:', error);
      throw error;
    }
  }

  static async endInactiveInterval(username, currentTime) {
    try {
      console.log(`[API] Finalizando intervalo de inactividad para ${username}`);
      const response = await fetch(`${API_URL}/inactive-interval/end/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timestamp: currentTime }),
      });
      if (!response.ok) {
        throw new Error(`Error al finalizar intervalo de inactividad: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[API] Error en endInactiveInterval:', error);
      throw error;
    }
  }

} 