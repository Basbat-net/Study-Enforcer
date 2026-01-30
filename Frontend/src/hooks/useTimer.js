// Gestion del timer

// Inputs:
// - currentUser: string (usuario actual)
// - isActiveTrackingMode: boolean (modo de tracking activo)
// - isPageVisible: boolean (pagina visible)

// Returns:
//  time, setTime, 
//  isRunning, setIsRunning,
//  lastActivityStart, setLastActivityStart,
//  lastInactivityStart, setLastInactivityStart,
//  loadTimerState, 
//  saveState,
//  reset

// Funciones importantes:
// - loadTimerState: se obtiene el estado del timer del usuario desde el servidor
// - saveState: se guarda el estado del timer del usuario en el servidor
// - reset: se resetea el timer

// useEffects:
// se usa uno que reacciona 

import { useState, useRef, useCallback, useEffect } from 'react';
import { ApiService } from '../services/api';

export function useTimer(currentUser, isActiveTrackingMode, isPageVisible) {
  const [time, setTime] = useState(0); // int (ms)
  const [isRunning, setIsRunning] = useState(false); // boolean
  const [lastActivityStart, setLastActivityStart] = useState(null); // int (ms)
  const [lastInactivityStart, setLastInactivityStart] = useState(null); // int (ms)

  // Load saved timer state for user
  const loadTimerState = useCallback(async (username) => {
    // Si no hay usuario, se resetea el timer
    if (!username) {
      setTime(0);
      setIsRunning(false);
      setLastActivityStart(null);
      setLastInactivityStart(null);
      return null;
    }

    // Se obtiene el estado del timer del usuario desde el servidor
    const timerState = await ApiService.getTimerState(username);
    // Comporbamos si el valor es valido, si no devolvemos null
    if (timerState && timerState.time) {
      setTime(timerState.time);
      return timerState;
    } else {
      setTime(0);
      return null;
    }
  }, []);

  // Guardamos el timer al servidor 
  // Importante: overrides es un diccionario que, si tiene algun valor, se come a los por defecto,
  // en caso de que alguna parte de el codigo lo necesite
  const saveState = useCallback(async (overrides = {}, usernameOverride = null) => {
    const user = usernameOverride || currentUser;
    if (!user) return;
    
    const currentTime = Date.now();
    await ApiService.saveTimerState(user, {
      time,
      lastUpdate: currentTime,
      wasPaused: !isRunning,
      wasRunning: isRunning,
      isActiveTrackingMode,
      ...overrides
    });
  }, [currentUser, time, isRunning, isActiveTrackingMode]);

  
  // el useEffect escucha a los parametros del array de abajo
  useEffect(() => {
    let frameId;
    // Se pone aqui arriba para cuadrar la 1a ejecucion
    let lastTick = Date.now();

    const updateTimer = () => {
      if (!isRunning || (isActiveTrackingMode && !isPageVisible)) return;

      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;

      // Se guarda por deltas
      setTime(prevTime => {
        const newTime = prevTime + delta;
        return newTime;
      });
      frameId = requestAnimationFrame(updateTimer);
    };

    if (isRunning && (!isActiveTrackingMode || isPageVisible)) {
      // Se actualiza el ticck
      lastTick = Date.now();
      // si no hay inicio
      if (!lastActivityStart) {
        const currentTime = Date.now();
        setLastActivityStart(currentTime);
        if (!isActiveTrackingMode) {
          setLastInactivityStart(currentTime);
        }
      }
      // se corre la arrowfunction sin parametros (corre sola todo dentro)
      frameId = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (frameId) {
        // para cuando se para el timer (va a returnear algo)
        cancelAnimationFrame(frameId);
      }
    };
  }, 
  // IMPORTANTE: esto corre siempre una vez como minimo (es useEffect)
  // el bucle empieza con cualquiera de estas 4 condiciones haciendo cosas (o al principio)
  [isRunning, isActiveTrackingMode, lastActivityStart, isPageVisible]);

  // Reset timer
  const reset = useCallback(() => {
    setTime(0);
    setLastActivityStart(null);
    setLastInactivityStart(null);
  }, []);

  return {
    time, setTime,
    isRunning, setIsRunning,
    lastActivityStart, setLastActivityStart,
    lastInactivityStart, setLastInactivityStart,
    loadTimerState,
    saveState,
    reset
  };
}
