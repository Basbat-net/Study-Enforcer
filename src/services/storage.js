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



// ANOTACION IMPORTANTE
// Storage y api no son redundantes, basicamente lo que hace la estructura general del codigo es
// El app.jsx ejecuta todos los inputs del 
import { ApiService } from './api';

export class StorageService {
  static logOperationQueue = new Map();
  static lastKnownLogCounts = new Map();

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
      // Cada usuario tiene una propia queue
      if (!this.logOperationQueue.has(username)) {
        this.logOperationQueue.set(username, Promise.resolve());
      }

      
      // Esto utiliza una estructura de datos que es basicamente un map (dictionary) en el que cada indice es 
      // una lista de promesas. Lo que haces con el dogido es reescribir el valor de la key con la lista de promesas
      // mas la ultima accion que se ha hecho.

      // ¿Qué es una lista de promesas?
      // Basicamente es una cadena sucesiva de funciones que metes para que las acciones en vez de ejecutarse cada una a su bola
      // se hagan de manera sucesiva y no se sobreescriban cosas. la estructura es algo como asi
      //Promise.resolve()
      //.then(() => step1())
      //.then(() => step2())
      //.then(() => step3());

      this.logOperationQueue.set(
        username,
        // IMPORTANTE: La ejecucion del codigo se hace aqui con el then(), el await de abajo lo que va a 
        // hacer es esperar a que se resuelva la ultima promesa de la cadena, y soltar un error en caso de que haya fallado algo
        // internamente, basicamente la promesa está inicialmente en unresolved y va a triggerear el fin del await solo cuando cambie
        // a resolved o rejected.
        this.logOperationQueue.get(username).then(async () => {
          try {

            const currentLogs = await this.getLogs(username);
            const expectedCount = this.lastKnownLogCounts.get(username) || 0;
            
            // Verify we haven't lost any logs
            if (currentLogs.length < expectedCount) {
              console.warn(`Log count mismatch for ${username}. Expected: ${expectedCount}, Got: ${currentLogs.length}`);
              // Try to recover from local storage
              const backupLogsStr = localStorage.getItem(`backup_logs_${username}`);
              if (backupLogsStr) {
                const backupLogs = JSON.parse(backupLogsStr);
                if (backupLogs.length > currentLogs.length) {
                  console.log(`Recovering ${backupLogs.length} logs from backup`);
                  await ApiService.saveLogs(username, backupLogs);
                  currentLogs.push(...backupLogs.slice(currentLogs.length));
                }
              }
            }
            
            // Add new log
            currentLogs.push(log);
            
            // Save to backup before server
            localStorage.setItem(`backup_logs_${username}`, JSON.stringify(currentLogs));
            
            // Save to server
            await ApiService.saveLogs(username, currentLogs);
            
            // Update last known count
            this.lastKnownLogCounts.set(username, currentLogs.length);
            
            return currentLogs;
          } catch (error) {
            console.error('Error in queued log operation:', error);
            throw error;
          }
        })
      );

      // Aqui lo que haces es awaiu
      await this.logOperationQueue.get(username);
    } catch (error) {
      console.error('Error al añadir log:', error);
      // Save to backup even if server save fails
      try {
        const currentLogs = await this.getLogs(username);
        currentLogs.push(log);
        localStorage.setItem(`backup_logs_${username}`, JSON.stringify(currentLogs));
      } catch (backupError) {
        console.error('Error saving to backup:', backupError);
      }
    }
  }


  // < --- TIMER --- >
  
  // saveTimerState()
  // Basicamente esta funcion es una manera de llamar a la api asegurandose 
  // de que los valores tienen buen formato
  // posiblemente se pueda modificar para quitar lineas de codigo
  static async saveTimerState(username, state) {
    if (!username) return; // esto es porsiaca creo que no puede ocurrir
    
    try {
      const timeToSave = typeof state.time === 'number' ? state.time : 0; // otro que creo que no pasa pero para q guarde solo numeros
      // Save timer state to server
      await ApiService.saveTimerState(username, {
        time: timeToSave,
        lastUpdate: state.lastUpdate || Date.now(),
        wasPaused: state.wasPaused || false,
        wasRunning: state.wasRunning || false,
        isActiveTrackingMode: state.isActiveTrackingMode
      });
    } catch (error) {
      console.error('Error al guardar el estado del temporizador:', error);
    }
  }

  static async getTimerState(username) {
    if (!username) return null;
    
    try {
      const state = await ApiService.getTimerState(username);
      if (!state) return null;

      if (typeof state.time !== 'number') {
        return null;
      }

      return {
        time: state.time,
        lastUpdate: state.lastUpdate || Date.now(),
        wasPaused: state.wasPaused || false,
        wasRunning: state.wasRunning || false,
        isActiveTrackingMode: state.isActiveTrackingMode
      };
    } catch (error) {
      console.error('Error al obtener el estado del temporizador:', error);
      return null;
    }
  }

  static async clearTimerState(username) {
    if (!username) return;
    try {
      await ApiService.clearTimerState(username);
    } catch (error) {
      console.error('Error al limpiar el estado del temporizador:', error);
    }
  }
} 