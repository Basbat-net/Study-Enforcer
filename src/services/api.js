/**
 * API Service
 * 
 * Service class that handles all API communication with the backend server.
 * Provides methods for:
 * - Fetching user logs
 * - Saving user logs
 * - Adding new activity logs
 * - Clearing user logs
 * - Managing inactive intervals
 * 
 * Features:
 * - Centralized API endpoint management
 * - Error handling
 * - Response parsing
 * - Consistent API interface
 */

// Use the same domain as the frontend
const API_URL = `${window.location.origin}/api`;

export class ApiService {

// < --- LOGS --- >

  static async getLogs(username) {
    try {
      console.log(`[API] Attempting to fetch logs for user: ${username}`);
      console.log(`[API] Request URL: ${API_URL}/logs/${username}`);
      
      const response = await fetch(`${API_URL}/logs/${username}`);
      console.log(`[API] Response status: ${response.status}`);
      
      if (!response.ok) {
        console.error(`[API] Error response: ${response.status} ${response.statusText}`);
        throw new Error(`Error al obtener logs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[API] Successfully fetched ${data.length} logs for user: ${username}`);
      
      // Check for failed logs in localStorage
      try {
        const failedLogsKey = `failed_logs_${username}`;
        const failedLogs = JSON.parse(localStorage.getItem(failedLogsKey) || '[]');
        if (failedLogs.length > 0) {
          console.log(`[API] Found ${failedLogs.length} failed logs in localStorage`);
          // Try to append failed logs
          for (const log of failedLogs) {
            try {
              await this.addLog(username, log);
            } catch (error) {
              console.error('[API] Error recovering failed log:', error);
              continue;
            }
          }
          // Clear failed logs after successful recovery
          localStorage.removeItem(failedLogsKey);
          // Fetch logs again to get the complete set
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
      
      return data;
    } catch (error) {
      console.error('[API] Error in getLogs:', error);
      throw error;
    }
  }

  static async saveLogs(username, logs) {
    try {
      console.log(`[API] Guardando ${logs.length} logs para ${username}`);
      const response = await fetch(`${API_URL}/logs/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logs),
      });
      if (!response.ok) {
        console.error(`[API] Error al guardar logs: ${response.status} ${response.statusText}`);
        throw new Error(`Error al guardar logs: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('[API] Logs guardados exitosamente');
      return data;
    } catch (error) {
      console.error('[API] Error en saveLogs:', error);
      // Store in localStorage as backup
      try {
        localStorage.setItem(`backup_logs_${username}`, JSON.stringify(logs));
        console.log('[API] Logs saved to localStorage backup');
      } catch (backupError) {
        console.error('[API] Error saving to backup:', backupError);
      }
      throw error;
    }
  }

  static async addLog(username, log) {
    try {
      console.log(`[API] Añadiendo nuevo log para ${username}:`, log);
      const response = await fetch(`${API_URL}/logs/${username}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(log),
      });
      if (!response.ok) {
        console.error(`[API] Error al añadir log: ${response.status} ${response.statusText}`);
        throw new Error(`Error al añadir log: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('[API] Log añadido exitosamente');
      return data;
    } catch (error) {
      console.error('[API] Error en addLog:', error);
      // Store in localStorage as backup
      try {
        const backupKey = `failed_logs_${username}`;
        const failedLogs = JSON.parse(localStorage.getItem(backupKey) || '[]');
        failedLogs.push(log);
        localStorage.setItem(backupKey, JSON.stringify(failedLogs));
        console.log('[API] Log saved to localStorage backup');
      } catch (backupError) {
        console.error('[API] Error saving to backup:', backupError);
      }
      throw error;
    }
  }

  static async clearLogs(username) {
    try {
      console.log(`[API] Limpiando logs para ${username}`);
      const response = await fetch(`${API_URL}/logs/${username}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        console.error(`[API] Error al limpiar logs: ${response.status} ${response.statusText}`);
        throw new Error(`Error al limpiar logs: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('[API] Logs limpiados exitosamente');
      return data;
    } catch (error) {
      console.error('[API] Error en clearLogs:', error);
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
        body: JSON.stringify({ currentTime }),
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

// < --- TIMER --- >

  static async getTimerState(username) {
    try {
      console.log(`[API] Getting timer state for ${username}`);
      const response = await fetch(`${API_URL}/timer-state/${username}`);
      
      if (!response.ok) {
        throw new Error(`Error getting timer state: ${response.status}`);
      }

      const state = await response.json();
      
      // If we got a null state or invalid state, return null
      if (!state || typeof state !== 'object') {
        return null;
      }

      // Validate and sanitize the state
      const validState = {
        time: typeof state.time === 'number' ? state.time : 0,
        lastUpdate: typeof state.lastUpdate === 'number' ? state.lastUpdate : Date.now(),
        wasPaused: Boolean(state.wasPaused),
        wasRunning: Boolean(state.wasRunning),
        isActiveTrackingMode: state.isActiveTrackingMode !== undefined ? Boolean(state.isActiveTrackingMode) : true
      };

      // Store backup in localStorage
      try {
        localStorage.setItem(`timer_state_backup_${username}`, JSON.stringify(validState));
      } catch (backupError) {
        console.error('[API] Error saving timer state backup:', backupError);
      }

      return validState;
    } catch (error) {
      console.error('[API] Error getting timer state:', error);
      
      // Try to recover from localStorage backup
      try {
        const backupStr = localStorage.getItem(`timer_state_backup_${username}`);
        if (backupStr) {
          const backupState = JSON.parse(backupStr);
          console.log('[API] Recovered timer state from backup:', backupState);
          return backupState;
        }
      } catch (backupError) {
        console.error('[API] Error reading timer state backup:', backupError);
      }
      
      // Return safe default state
      return {
        time: 0,
        lastUpdate: Date.now(),
        wasPaused: true,
        wasRunning: false,
        isActiveTrackingMode: true
      };
    }
  }

  static async saveTimerState(username, state) {
    try {
      console.log(`[API] Saving timer state for ${username}:`, state);
      
      // Validate and sanitize state before saving
      const validState = {
        time: typeof state.time === 'number' ? state.time : 0,
        lastUpdate: typeof state.lastUpdate === 'number' ? state.lastUpdate : Date.now(),
        wasPaused: Boolean(state.wasPaused),
        wasRunning: Boolean(state.wasRunning),
        isActiveTrackingMode: state.isActiveTrackingMode !== undefined ? Boolean(state.isActiveTrackingMode) : true
      };

      // Store backup in localStorage before server save
      try {
        localStorage.setItem(`timer_state_backup_${username}`, JSON.stringify(validState));
      } catch (backupError) {
        console.error('[API] Error saving timer state backup:', backupError);
      }

      const response = await fetch(`${API_URL}/timer-state/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validState)
      });

      if (!response.ok) {
        throw new Error(`Error saving timer state: ${response.status}`);
      }

      const result = await response.json();
      console.log('[API] Timer state saved successfully');
      return result;
    } catch (error) {
      console.error('[API] Error saving timer state:', error);
      throw error;
    }
  }

  static async clearTimerState(username) {
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
} 