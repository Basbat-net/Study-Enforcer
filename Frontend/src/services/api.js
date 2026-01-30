// one billion static functions
// Esto es para hacer de bridge entre el frontend y el backend

// - getUsers: fetch a API_URL/users 
// TODO DEBAJO DE AQUI SE PONE CON COPIA EN LOCALSTORAGE
// - getLogs: fetch API_URL/logs/{username} 
// - saveLogs: POST API_URL/logs/{username} 
// - addLog: POST API_URL/logs/{username}/add pero con una QUEUE (explicada en funcion)
// - clearLogs: DELETE API_URL/logs/{username}
// - startInactiveInterval: POST API_URL/inactive-interval/start/{username}
// - endInactiveInterval: POST API_URL/inactive-interval/end/{username}
// - getTimerState: GET API_URL/timer-state/{username}
// - saveTimerState: POST API_URL/timer-state/{username}
// - clearTimerState: DELETE API_URL/timer-state/{username}


// IMPORTANTE: Como son funciones que se llaman dentro de una clase para llamar otras 
// funciones hay que hacer this.function
const API_URL = `${window.location.origin}/api`;

export class ApiService {
  static logOperationQueue = new Map();
  static lastKnownLogCounts = new Map();

  // --- USERS ---

  static async getUsers() {
    // le pedimos los usuarios al servidor con fetch y tocotó
    try {
      const response = await fetch(`${API_URL}/users`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('[API] Error fetching users:', error);
    }
    return [];
  }

  // --- LOGS ---

  // Recuperamos los logs del servidor
  static async getLogs(username) {
    // si no hay username, devolvemos un array vacío
    if (!username) return [];

    try {
      // probamos a tirar un fetch
      const response = await fetch(`${API_URL}/logs/${username}`);
      if (!response.ok) { throw new Error(`Error al obtener logs: ${response.status} ${response.statusText}`); }
      let data = await response.json();
      const logs = Array.isArray(data) ? data : [];

      // intentamos ver si hay algun log que falta en localStorage
      const failedLogsKey = `failed_logs_${username}`;
      const failedLogs = JSON.parse(localStorage.getItem(failedLogsKey) || '[]');
      if (failedLogs.length > 0) {
        // expandimos los dos en un array, y como son diccionarios en teoria se juntan
        const merged = [...logs, ...failedLogs];
        // se los guardamos en el servidor
        await this.saveLogs(username, merged);
        // los quitamos de localStorage porque ya los hemos guardado en el servidor
        localStorage.removeItem(failedLogsKey);
        // despues de mandarselos al servidor simplemente devolvemos el merged
        data = merged;
      }

      // guardamos el numero de logs en el lastKnownLogCounts
      this.lastKnownLogCounts.set(username, Array.isArray(data) ? data.length : 0);
      // devolvemos el array de logs, si no es un array devolvemos un array vacío
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[API] Error in getLogs:', error);
      return [];
    }
  }

  // Nota: aqui hay un race condition que puede o puede que no importe, lo arreglaré en otro momento
  // esta funcion reemplaza todos los logs del servidor con todo lo q le mandemos
  static async saveLogs(username, logs) {
    try {
      const response = await fetch(`${API_URL}/logs/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logs),
      });
      if (!response.ok) {
        throw new Error(`Error al guardar logs: ${response.status} ${response.statusText}`);
      }
      return response.json();
    } 
    // si falla, guardamos los logs en el localStorage como backup
    catch (error) {
      console.error('[API] Error en saveLogs:', error);
      try {
        localStorage.setItem(`backup_logs_${username}`, JSON.stringify(logs));
      } catch (e) {
        console.error('[API] Error saving to backup:', e);
      }
      throw error;
    }
  }

  // metemos un solo log al servidor con una queue
  static async addLog(username, log) {
    if (!username) return;

    // si no hay nada en la queue PARA ESTE USUARIO, la creamos
    if (!this.logOperationQueue.has(username)) {
      // IMPORTANTE: La queue se declara con una promise ya resuelta, asi que cuando se llama
      // el .then, como ya se ha resuelto, se ejecuta la arrow function directamente
      this.logOperationQueue.set(username, Promise.resolve());
    }

    // esta linea busca la ultima promesa en la queue, que viene dada por this.logOperationQueue.get(username),
    // y una vez que eso se resuelva, la funcion .then se ejecutará
    // Nota: .then se ejecuta cuando se resuelve una promesa (return resolved)
    const run = this.logOperationQueue.get(username).then(async () => {
      try {
        const currentLogs = await this.getLogs(username);
        const expectedCount = this.lastKnownLogCounts.get(username) || 0;

        if (currentLogs.length < expectedCount) {
          const backupStr = localStorage.getItem(`backup_logs_${username}`);
          if (backupStr) {
            const backupLogs = JSON.parse(backupStr);
            if (backupLogs.length > currentLogs.length) {
              await this.saveLogs(username, backupLogs);
              currentLogs.length = 0;
              currentLogs.push(...backupLogs);
            }
          }
        }

        currentLogs.push(log);
        localStorage.setItem(`backup_logs_${username}`, JSON.stringify(currentLogs));
        await this.saveLogs(username, currentLogs);
        this.lastKnownLogCounts.set(username, currentLogs.length);
        return currentLogs;
      } catch (error) {
        console.error('[API] Error in queued addLog:', error);
        throw error;
      }
    });

    // una vez que está esperando, se mete esa promesa al final de la queue, para que la siguiente
    // tarea la espere
    this.logOperationQueue.set(username, run);

    try {
      // esperamos a que nuestra call especifica funcione
      await run;
    } 
    // si falla algo nos quejamos
    catch (error) {
      try {
        // si falla intentamos guardarlo en localStorage
        const currentLogs = await this.getLogs(username);
        currentLogs.push(log); // les metemos el log que hemos intentado guardar
        localStorage.setItem(`backup_logs_${username}`, JSON.stringify(currentLogs));
      } catch (e) {
        console.error('[API] Error saving to backup:', e);
      }
    }
  }

  static async clearLogs(username) {
    if (!username) return;
    try {
      // Tiramos un fetch con ese metodo y borramos todo
      const response = await fetch(`${API_URL}/logs/${username}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Error al limpiar logs: ${response.status}`);
      }
      // Si borramos bien, borramos tambien localStorage
      localStorage.removeItem(`backup_logs_${username}`);
      localStorage.removeItem(`failed_logs_${username}`);
      this.lastKnownLogCounts.set(username, 0);
      return response.json();
    } catch (error) {
      console.error('[API] Error en clearLogs:', error);
    }
  }

  // --- INACTIVITY INTERVALS ---

  static async startInactiveInterval(username, timestamp) {
    // Tiramos fetch a la ruta y ya
    const response = await fetch(`${API_URL}/inactive-interval/start/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp }),
    });
    if (!response.ok) {
      throw new Error(`Error al iniciar intervalo de inactividad: ${response.status}`);
    }
    return response.json();
  }

  static async endInactiveInterval(username, currentTime) {
    // Fetch a eso y a tomar por culo
    const response = await fetch(`${API_URL}/inactive-interval/end/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentTime }),
    });
    if (!response.ok) {
      throw new Error(`Error al finalizar intervalo de inactividad: ${response.status}`);
    }
    return response.json();
  }

  // --- TIMER STATE ---

  static _normalizeTimerState(state) {
    if (!state || typeof state !== 'object') return null;
    return {
      time: Number(state.time) || 0,
      lastUpdate: Number(state.lastUpdate) || Date.now(),
      wasPaused: Boolean(state.wasPaused),
      wasRunning: Boolean(state.wasRunning),
      isActiveTrackingMode: state.isActiveTrackingMode !== undefined ? Boolean(state.isActiveTrackingMode) : true,
    };
  }

  // estos 3 son simplemente fetch a la ruta y ya
  static async getTimerState(username) {
    if (!username) return null;
    try {
      const response = await fetch(`${API_URL}/timer-state/${username}`);
      if (!response.ok) throw new Error(`Error getting timer state: ${response.status}`);
      const valid = this._normalizeTimerState(await response.json());
      if (valid) localStorage.setItem(`timer_state_backup_${username}`, JSON.stringify(valid));
      return valid;
    } catch (error) {
      console.error('[API] Error getting timer state:', error);
      const backupStr = localStorage.getItem(`timer_state_backup_${username}`);
      return backupStr ? this._normalizeTimerState(JSON.parse(backupStr)) : null;
    }
  }

  static async saveTimerState(username, state) {
    if (!username) return;
    const valid = this._normalizeTimerState({ ...state, lastUpdate: state?.lastUpdate ?? Date.now() });
    if (!valid) return;
    try {
      localStorage.setItem(`timer_state_backup_${username}`, JSON.stringify(valid));
    } catch (e) {}
    const response = await fetch(`${API_URL}/timer-state/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valid),
    });
    if (!response.ok) throw new Error(`Error saving timer state: ${response.status}`);
    return response.json();
  }

  static async clearTimerState(username) {
    if (!username) return;
    const response = await fetch(`${API_URL}/timer-state/${username}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Error clearing timer state: ${response.status}`);
    localStorage.removeItem(`timer_state_backup_${username}`);
    return response.json();
  }
}
