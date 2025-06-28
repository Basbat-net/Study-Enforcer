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

  static async addUser(username) {
    // Users are created automatically when they first save data
    // This method exists for compatibility
    return true;
  }

  // < --- LOGS --- >

  static async getLogs(username) {
    if (!username) return [];
    
    try {
      const logs = await ApiService.getLogs(username);
      const validLogs = Array.isArray(logs) ? logs : [];
      
      // Update our last known count
      this.lastKnownLogCounts.set(username, validLogs.length);
      
      return validLogs;
    } catch (error) {
      console.error('Error al obtener logs:', error);
      return [];
    }
  }

  static async addLog(username, log) {
    if (!username) return;
    
    try {
      // Create a queue for this user if it doesn't exist
      if (!this.logOperationQueue.has(username)) {
        this.logOperationQueue.set(username, Promise.resolve());
      }

      // Add this operation to the queue
      this.logOperationQueue.set(
        username,
        this.logOperationQueue.get(username).then(async () => {
          try {
            // Get current logs
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

      // Wait for the operation to complete
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

  static async clearLogs(username) {
    if (!username) return;
    
    try {
      // Clear both server and local backup
      await ApiService.clearLogs(username);
      localStorage.removeItem(`backup_logs_${username}`);
      this.lastKnownLogCounts.set(username, 0);
    } catch (error) {
      console.error('Error al limpiar logs:', error);
    }
  }

  // < --- TIMER --- >
  
  static async saveTimerState(username, state) {
    if (!username) return;
    
    try {
      const timeToSave = typeof state.time === 'number' ? state.time : 0;
      
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