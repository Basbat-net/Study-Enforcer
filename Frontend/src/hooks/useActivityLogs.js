/**
 * useActivityLogs Hook
 * 
 * Manages activity logs including fetching, adding, and calculating totals.
 * Handles backup recovery from localStorage.
 */

import { useState, useCallback, useEffect } from 'react';
import { ApiService } from '../services/api';

export function useActivityLogs(currentUser) {
  const [activityLogs, setActivityLogs] = useState([]);
  const [activeTime, setActiveTime] = useState(0);
  const [inactiveTime, setInactiveTime] = useState(0);
  const [showLogs, setShowLogs] = useState(false);

  // Calculate totals from logs
  const calculateTotals = useCallback((logs) => {
    return logs.reduce((acc, log) => {
      if (log.type === 'active') {
        acc.active += log.duration;
      } else {
        acc.inactive += log.duration;
      }
      return acc;
    }, { active: 0, inactive: 0 });
  }, []);

  // Recover backup logs from localStorage
  const recoverBackupLogs = useCallback(async (username) => {
    try {
      const backupLogsStr = localStorage.getItem(`backup_logs_${username}`);
      if (backupLogsStr) {
        const backupLogs = JSON.parse(backupLogsStr);
        const serverLogs = await ApiService.getLogs(username);
        
        // Compare backup with server logs to find missing entries
        const missingLogs = backupLogs.filter(backupLog => 
          !serverLogs.some(serverLog => 
            serverLog.timestamp === backupLog.timestamp && 
            serverLog.endTimestamp === backupLog.endTimestamp
          )
        );
        
        if (missingLogs.length > 0) {
          console.log(`Recovering ${missingLogs.length} missing logs for ${username}`);
          const updatedLogs = [...serverLogs, ...missingLogs];
          await ApiService.saveLogs(username, updatedLogs);
          setActivityLogs(updatedLogs);
          
          // Update totals
          const totals = calculateTotals(updatedLogs);
          setActiveTime(totals.active);
          setInactiveTime(totals.inactive);
        }
        
        // Clear backup after successful recovery
        localStorage.removeItem(`backup_logs_${username}`);
      }
    } catch (error) {
      console.error('Error recovering backup logs:', error);
    }
  }, [calculateTotals]);

  // Load logs for a user
  const loadLogs = useCallback(async (username) => {
    if (!username) {
      setActivityLogs([]);
      setActiveTime(0);
      setInactiveTime(0);
      return;
    }

    try {
      // Try to recover any backup logs first
      await recoverBackupLogs(username);
      
      // Load logs from server
      const logs = await ApiService.getLogs(username);
      setActivityLogs(logs);
      
      // Calculate totals
      const totals = calculateTotals(logs);
      setActiveTime(totals.active);
      setInactiveTime(totals.inactive);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }, [recoverBackupLogs, calculateTotals]);

  // Add a new log entry
  const addLog = useCallback(async (log) => {
    if (!currentUser) return;
    
    await ApiService.addLog(currentUser, log);
    setActivityLogs(prev => [...prev, log]);
    
    if (log.type === 'active') {
      setActiveTime(prev => prev + log.duration);
    } else {
      setInactiveTime(prev => prev + log.duration);
    }
  }, [currentUser]);

  // Clear all logs
  const clearLogs = useCallback(async () => {
    if (!currentUser) return;
    
    if (window.confirm(`¿Estás seguro de que quieres borrar todos los registros de ${currentUser}? Esta acción no se puede deshacer.`)) {
      await ApiService.clearLogs(currentUser);
      setActivityLogs([]);
      setActiveTime(0);
      setInactiveTime(0);
    }
  }, [currentUser]);

  // Toggle logs visibility
  const toggleLogs = useCallback(() => {
    setShowLogs(prev => !prev);
  }, []);

  // Load logs when user changes
  useEffect(() => {
    if (currentUser) {
      loadLogs(currentUser);
    }
  }, [currentUser, loadLogs]);

  return {
    activityLogs,
    setActivityLogs,
    activeTime,
    setActiveTime,
    inactiveTime,
    setInactiveTime,
    showLogs,
    toggleLogs,
    addLog,
    clearLogs,
    loadLogs,
    calculateTotals
  };
}
