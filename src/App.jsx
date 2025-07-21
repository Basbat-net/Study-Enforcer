/**
 * Main application component for TrackerEstudio
 * 
 * This is the core component that manages:
 * - Timer functionality (start, stop, reset)
 * - User session management
 * - Activity tracking (active/inactive states)
 * - Log management and display
 * - Mode switching between active tracking and normal timer
 * 
 * The component handles all the main application logic including:
 * - Timer state management
 * - Page visibility tracking
 * - Activity logging
 * - User state persistence
 * - UI rendering for the timer and activity logs
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { UserSelector } from './components/UserSelector'
import { ActivityCharts } from './components/ActivityCharts'
import { HelpPopup } from './components/HelpPopup'
import { bridgeJsxServer } from './services/bridgeJsxServer'
import './App.css'
import './styles/ActivityCharts.css'
import './styles/ModeSelector.css'

export default function App() {
  // los useState basicamente  son  como  variables pero que  cuando cambian
  // react lo sabe y rerenderiza el componente
  // las variables se cambian llamando a la funcion de la pareja de  la  dupla 
  // setTime por ejemplo, se  usa como setTime(10) que es como decir time = 10 pero con  react shit
  
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [activeTime, setActiveTime] = useState(0)
  const [inactiveTime, setInactiveTime] = useState(0)
  const [activityLogs, setActivityLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  const [lastActivityStart, setLastActivityStart] = useState(null)
  const [lastInactivityStart, setLastInactivityStart] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isActiveTrackingMode, setIsActiveTrackingMode] = useState(true)
  
  // Screen saver states
  const [isScreenSaverActive, setIsScreenSaverActive] = useState(false)
  const [screenSaverPosition, setScreenSaverPosition] = useState({ x: 100, y: 100 })
  const [screenSaverVelocity, setScreenSaverVelocity] = useState({ x: 2, y: 2 })
  const [screenSaverColor, setScreenSaverColor] = useState('#00ff00')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isScreenSaverJustDismissed, setIsScreenSaverJustDismissed] = useState(false)
  
  // Refs
  const wakeLockRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const lastInteractionRef = useRef(Date.now());
  const screenSaverIntervalRef = useRef(null);
  const appStartTimeRef = useRef(Date.now());

  // Screen saver configuration
  const SCREENSAVER_DELAY = 60  * 1000; 
  const SCREENSAVER_ELEMENT_SIZE = 120;
  const SCREENSAVER_SPEED = 2;

  // Colors for bouncing element
  const colors = ['#00ff00', '#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];




// < -------------------------------------- FUNCIONES -------------------------------------- >

// < --- PANTALLA COMPLETA --- >

  // enterFullscreen()
  // Cambio a full screen

  // COMPROBADA (La entiendo)
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen();
      }
    } catch (error) {
      console.error('Error entering fullscreen:', error);
    }
  };

  // exitFullscreen()
  // Salida de full screen

  // COMPROBADA (La entiendo)
  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  };

  // toggleFullscreen()
  // Es un toggle  osea  q mas  quieres q diga

  // COMPROBADA (La entiendo)
  const toggleFullscreen = async () => await (isFullscreen ? exitFullscreen() : enterFullscreen());

// < --- SCREENSAVER --- >

  // dismissScreenSaver()
  // Desactiva el screensaver y hay un intervalo en el que no se  pueude pulsar 
  // para  que no se pueda pulsar  el boton de  reinicio

  // COMPROBADA (La entiendo)
  const dismissScreenSaver = () => {
    if (isScreenSaverActive) {
      setIsScreenSaverActive(false);
      setIsScreenSaverJustDismissed(true); 
      // Esta variable  es  la que  evita  que  se pulse el boton
      // despues de  un screensaver  se quite
      
      // Re-enable button interactions after 10 seconds
      setTimeout(() => {
        setIsScreenSaverJustDismissed(false); 
      }, 10000);
    }
  };


// < --- TIMER --- >

  // handleStart()
  // Manejo del boton de start del timer
  const handleStart = async () => {
    if (isScreenSaverJustDismissed) return; // Para que no puedas pulsar el boton si acabas de quitarte el screensaver
    
    const currentTime = Date.now();
    setIsRunning(true);
    setLastActivityStart(currentTime);
    if (!isActiveTrackingMode) {
      setLastInactivityStart(currentTime);
    }
    await requestWakeLock(); // para que no  se apague el movil
    startKeepAlive(); // funcion que sigue pidiendolo
    //  Storage.js guarda el estado del time en timer_states.json
    await bridgeJsxServer.saveTimerState(currentUser, {
      time,
      lastUpdate: currentTime,
      wasPaused: false,
      wasRunning: true,
      isActiveTrackingMode,
      lastInactivityStartTime: !isActiveTrackingMode ? currentTime : null
    });
    startVideoPlayback(); // para que no  se apague el movil es un  video de  fondo sin nada
  };

  // handleStop()
  // Manejo del boton de stop del timer
  const handleStop = async () => {
    if (isScreenSaverJustDismissed) return;  // Boton no funciona si no screensaver
    
    const currentTime = Date.now();
    setIsRunning(false);

    // desactiva todas las cosas que se ponen para que  el movil no se apague solo
    await releaseWakeLock(); 
    stopKeepAlive();
    stopVideoPlayback();

    if (lastActivityStart) {
      if (isActiveTrackingMode) {
        // Solo registrar el tiempo activo al pausar
        const activeDuration = currentTime - lastActivityStart;
        // guarda el intervalo desde el ultimo inicio de  intervaloactivo en  logs.json
        const activeLog = {
          type: 'active',
          duration: activeDuration,
          timestamp: lastActivityStart,
          endTimestamp: currentTime,
          username: currentUser
        };
        await bridgeJsxServer.addLog(currentUser, activeLog);
        // lo de  prev es para asegurarte  que  te  pasa el valor que debería basicamente
        // en vez de  puntero es una  copia del valor  (creo)
        setActivityLogs(prev => [...prev, activeLog]);
        setActiveTime(prev => prev + activeDuration);
      } 
      // Este  da un  poco igual
      else {
        // En modo normal, registrar como inactivo
        const inactiveDuration = currentTime - lastActivityStart;
        const inactiveLog = {
          type: 'inactive',
          duration: inactiveDuration,
          timestamp: lastActivityStart,
          endTimestamp: currentTime,
          username: currentUser
        };
        await bridgeJsxServer.addLog(currentUser, inactiveLog);
        setActivityLogs(prev => [...prev, inactiveLog]);
        setInactiveTime(prev => prev + inactiveDuration);
      }
    }

    // se reinician los intervalos guardados y se mete el timer en timer_states.json
    setLastActivityStart(null);
    setLastInactivityStart(null);

    bridgeJsxServer.saveTimerState(currentUser, {
      time,
      lastUpdate: currentTime,
      wasPaused: true,
      wasRunning: false,
      isActiveTrackingMode
    });
  };

  const handleReset = async () => {
    if (isScreenSaverJustDismissed) return; 
    const currentTime = Date.now();
    
    // Basicamente  hace una pausa antes del reinicio  para que no se pierda el
    // ultimo intervalo  de  actividad
    if (isRunning) {
      setIsRunning(false);
      await releaseWakeLock();
      stopKeepAlive();
      stopVideoPlayback();

      if (lastActivityStart) {
        if (isActiveTrackingMode) {
          // Register the active time before resetting
          const activeDuration = currentTime - lastActivityStart;
          const activeLog = {
            type: 'active',
            duration: activeDuration,
            timestamp: lastActivityStart,
            endTimestamp: currentTime,
            username: currentUser
          };
          await bridgeJsxServer.addLog(currentUser, activeLog);
          setActivityLogs(prev => [...prev, activeLog]);
          setActiveTime(prev => prev + activeDuration);
        } else {
          // In normal mode, register as inactive
          const inactiveDuration = currentTime - lastActivityStart;
          const inactiveLog = {
            type: 'inactive',
            duration: inactiveDuration,
            timestamp: lastActivityStart,
            endTimestamp: currentTime,
            username: currentUser
          };
          await bridgeJsxServer.addLog(currentUser, inactiveLog);
          setActivityLogs(prev => [...prev, inactiveLog]);
          setInactiveTime(prev => prev + inactiveDuration);
        }
      }
    }
    
    // se reinician los intervalos guardados y se mete el timer en timer_states.json
    // lo unico se guarda un tiempo de 0
    setTime(0);
    setLastActivityStart(null);
    setLastInactivityStart(null);
    
    bridgeJsxServer.saveTimerState(currentUser, {
      time: 0,
      lastUpdate: currentTime,
      wasPaused: true,
      wasRunning: false,
      isActiveTrackingMode,
      lastInactivityStartTime: null
    });
  };

// < --- LOGS --- >

  // toggleLogs()
  // Es el que maneja el boton de loslogs
  const toggleLogs = () => setShowLogs(!showLogs)

  // handleClearLogs()
  // Limpia todos los registros de un usuario (debería borrarla)
  const handleClearLogs = async () => {
    if (window.confirm(`¿Estás seguro de que quieres borrar todos los registros de ${currentUser}? Esta acción no se puede deshacer.`)) {
      await bridgeJsxServer.clearLogs(currentUser); // en storage.js
      setActivityLogs([]);
      setActiveTime(0);
      setInactiveTime(0);
    }
  };


  // Add recovery function for backup logs
  const recoverBackupLogs = async (username) => {
    try {
      const backupLogsStr = localStorage.getItem(`backup_logs_${username}`);
      if (backupLogsStr) {
        const backupLogs = JSON.parse(backupLogsStr);
        const serverLogs = await bridgeJsxServer.getLogs(username);
        
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
          await bridgeJsxServer.saveLogs(username, updatedLogs);
          setActivityLogs(updatedLogs);
          
          // Update totals
          const totals = updatedLogs.reduce((acc, log) => {
            if (log.type === 'active') {
              acc.active += log.duration;
            } else {
              acc.inactive += log.duration;
            }
            return acc;
          }, { active: 0, inactive: 0 });
          
          setActiveTime(totals.active);
          setInactiveTime(totals.inactive);
        }
        
        // Clear backup after successful recovery
        localStorage.removeItem(`backup_logs_${username}`);
      }
    } catch (error) {
      console.error('Error recovering backup logs:', error);
    }
  };

  // < --- EVITAR QUE SE APAGUE LA PANTALLA --- >

  // Function to request wake lock
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock is active');
        
        // Add event listener for wake lock release
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock was released');
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      console.error(`Wake Lock request failed: ${err.name}, ${err.message}`);
    }
  };

  // Function to reacquire wake lock
  const reacquireWakeLock = async () => {
    if (isRunning && !document.hidden && (!wakeLockRef.current || wakeLockRef.current.released)) {
      console.log('Attempting to reacquire wake lock...');
      await requestWakeLock();
    }
  };

  // Function to release wake lock
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock released');
      } catch (err) {
        console.error(`Wake Lock release failed: ${err.name}, ${err.message}`);
      }
    }
  };

  // Function to start keep-alive ping
  const startKeepAlive = () => {
    if (keepAliveIntervalRef.current) return;
    
    keepAliveIntervalRef.current = setInterval(async () => {
      try {
        // Send a ping to the server every 30 seconds
        await fetch(`${window.location.origin}/api/ping`);
      } catch (error) {
        console.error('Keep-alive ping failed:', error);
      }
    }, 30000); // 30 seconds
  };

  // Function to stop keep-alive ping
  const stopKeepAlive = () => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  };

  // Function to start video playback
  const startVideoPlayback = async () => {
    if (videoRef.current) {
      try {
        videoRef.current.playbackRate = 0.1; // Slow down playback
        videoRef.current.volume = 0; // Ensure it's muted
        await videoRef.current.play();
        setIsVideoPlaying(true);
        console.log('Video playback started');
      } catch (error) {
        console.error('Error playing video:', error);
      }
    }
  };

  // Function to stop video playback
  const stopVideoPlayback = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
      console.log('Video playback stopped');
    }
  };

// < --- RESTO DE COSAS --- >

const handleUserSelect = async (username) => {
  const currentTime = Date.now();

  // Si hay un usuario actual y el cronómetro está corriendo, finalizar su sesión
  if (currentUser && isRunning) {
    if (lastActivityStart && isActiveTrackingMode) {
      // Registrar el tiempo activo
      const activeDuration = currentTime - lastActivityStart;
      const activeLog = {
        type: 'active',
        duration: activeDuration,
        timestamp: lastActivityStart,
        endTimestamp: currentTime,
        username: currentUser
      };
      await bridgeJsxServer.addLog(currentUser, activeLog);
      setActivityLogs(prev => [...prev, activeLog]);
      setActiveTime(prev => prev + activeDuration);
    } else if (!isActiveTrackingMode && lastActivityStart) {
      // En modo normal, registrar el tiempo como inactivo
      const inactiveDuration = currentTime - lastActivityStart;
      const inactiveLog = {
        type: 'inactive',
        duration: inactiveDuration,
        timestamp: lastActivityStart,
        endTimestamp: currentTime,
        username: currentUser
      };
      await bridgeJsxServer.addLog(currentUser, inactiveLog);
      setActivityLogs(prev => [...prev, inactiveLog]);
      setInactiveTime(prev => prev + inactiveDuration);
    }
  }

  setCurrentUser(username);
  setIsRunning(false);
  setLastActivityStart(null);
  setLastInactivityStart(null);
  
  // Cargar los registros del usuario seleccionado
  if (username) {
    const userLogs = await bridgeJsxServer.getLogs(username);
    setActivityLogs(userLogs);
    
    // Calcular tiempos totales
    const totals = userLogs.reduce((acc, log) => {
      if (log.type === 'active') {
        acc.active += log.duration;
      } else {
        acc.inactive += log.duration;
      }
      return acc;
    }, { active: 0, inactive: 0 });
    
    setActiveTime(totals.active);
    setInactiveTime(totals.inactive);

    // Verificar el estado del temporizador guardado
    const timerState = await bridgeJsxServer.getTimerState(username);
    if (!timerState || !timerState.time) {
      // Si no hay estado guardado o el tiempo es 0/null/undefined, inicializar en 0
      setTime(0);
      setIsRunning(false);
      setLastActivityStart(null);
      setLastInactivityStart(null);
      await bridgeJsxServer.saveTimerState(username, {
        time: 0,
        lastUpdate: currentTime,
        wasRunning: false,
        wasPaused: true,
        isActiveTrackingMode: true
      });
      setIsActiveTrackingMode(true);
    } else {
      // Si hay un estado guardado, restaurarlo
      setTime(timerState.time || 0);
      
      // Restaurar el estado de ejecución si estaba corriendo
      const wasRunning = timerState.wasRunning || false;
      setIsRunning(wasRunning);
      
      // Restaurar el modo de seguimiento
      const savedMode = timerState.isActiveTrackingMode ?? true;
      setIsActiveTrackingMode(savedMode);
      
      // Establecer el tiempo de inicio según el modo
      if (wasRunning) {
        if (savedMode) {
          setLastActivityStart(currentTime);
          setLastInactivityStart(null);
        } else {
          setLastActivityStart(currentTime);
          setLastInactivityStart(currentTime);
        }
        
        // Guardar el nuevo estado con la hora actual
        await bridgeJsxServer.saveTimerState(username, {
          time: timerState.time || 0,
          lastUpdate: currentTime,
          wasRunning: true,
          wasPaused: false,
          isActiveTrackingMode: savedMode,
          lastInactivityStartTime: !savedMode ? currentTime : null
        });
      } else {
        setLastActivityStart(null);
        setLastInactivityStart(null);
      }
    }
  } else {
    // Si no hay usuario, reiniciar todo
    setTime(0);
    setActiveTime(0);
    setInactiveTime(0);
    setActivityLogs([]);
    setLastActivityStart(null);
    setLastInactivityStart(null);
    setIsActiveTrackingMode(true);
  }
};

// Format time for display
const formatTime = useCallback((ms) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = Math.floor((ms % 1000) / 10)

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
}, [])


// Add toggle mode function
const toggleTrackingMode = () => {
  if (isScreenSaverJustDismissed) return; // Prevent action if screensaver was just dismissed
  
  const currentTime = Date.now();
  
  // If switching modes while timer is running, handle the current interval
  if (isRunning && lastActivityStart) {
    const activeDuration = currentTime - lastActivityStart;
    const activeLog = {
      type: 'active',
      duration: activeDuration,
      timestamp: lastActivityStart,
      endTimestamp: currentTime,
      username: currentUser
    };
    bridgeJsxServer.addLog(currentUser, activeLog);
    setActivityLogs(prev => [...prev, activeLog]);
    setActiveTime(prev => prev + activeDuration);
  }

  setIsActiveTrackingMode(prev => !prev);
  setLastActivityStart(isRunning ? currentTime : null);
  
  // Save the new mode preference
  bridgeJsxServer.saveTimerState(currentUser, {
    time,
    lastUpdate: currentTime,
    wasRunning: isRunning,
    wasPaused: !isRunning,
    isActiveTrackingMode: !isActiveTrackingMode
  });
};

// < -------------------------------------- USE EFFECTS -------------------------------------- >


  useEffect(() => {
    const loadUserState = async () => {
      if (currentUser) {
        const currentTime = Date.now();

        try {
          // Try to recover any backup logs first
          await recoverBackupLogs(currentUser);
          
          // Verificar y finalizar cualquier intervalo de inactividad pendiente
          const { inactiveLog } = await bridgeJsxServer.endInactiveInterval(currentUser, currentTime);
          
          // Cargar los logs del usuario directamente desde la API
          let userLogs = await bridgeJsxServer.getLogs(currentUser);
          
          // Si había un intervalo de inactividad pendiente, añadirlo a los logs
          if (inactiveLog) {
            userLogs = [...userLogs, inactiveLog];
            await bridgeJsxServer.saveLogs(currentUser, userLogs);
          }
          
          console.log('Loaded logs:', userLogs);
          setActivityLogs(userLogs);
          
          // Calcular tiempos totales
          const totals = userLogs.reduce((acc, log) => {
            if (log.type === 'active') {
              acc.active += log.duration;
            } else {
              acc.inactive += log.duration;
            }
            return acc;
          }, { active: 0, inactive: 0 });
          
          setActiveTime(totals.active);
          setInactiveTime(totals.inactive);

          // Restaurar estado del temporizador
          const timerState = await bridgeJsxServer.getTimerState(currentUser);
          if (timerState) {
            setTime(timerState.time || 0);
            setIsActiveTrackingMode(timerState.isActiveTrackingMode ?? true);
            setIsRunning(false);
            setLastActivityStart(null);
            setLastInactivityStart(null);
          } else {
            setTime(0);
            setIsRunning(false);
            setLastActivityStart(null);
            setLastInactivityStart(null);
            setIsActiveTrackingMode(true);
          }
        } catch (error) {
          console.error('Error loading user state:', error);
          // If there's an error, try to load logs directly from the API
          try {
            const userLogs = await bridgeJsxServer.getLogs(currentUser);
            setActivityLogs(userLogs);
            
            const totals = userLogs.reduce((acc, log) => {
              if (log.type === 'active') {
                acc.active += log.duration;
              } else {
                acc.inactive += log.duration;
              }
              return acc;
            }, { active: 0, inactive: 0 });
            
            setActiveTime(totals.active);
            setInactiveTime(totals.inactive);
          } catch (retryError) {
            console.error('Error loading logs from API:', retryError);
          }
        }
      }
    };

    loadUserState();
  }, [currentUser]);

  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      if (isRunning) {
        event.preventDefault();
        event.returnValue = '';
        
        const currentTime = Date.now();

        // Si hay un intervalo activo en curso, finalizarlo
        if (lastActivityStart && isActiveTrackingMode) {
          const activeDuration = currentTime - lastActivityStart;
          const activeLog = {
            type: 'active',
            duration: activeDuration,
            timestamp: lastActivityStart,
            endTimestamp: currentTime,
            username: currentUser
          };
          await bridgeJsxServer.addLog(currentUser, activeLog);
          
          // Iniciar intervalo de inactividad y guardarlo
          const inactiveLog = {
            type: 'inactive',
            duration: 0, // La duración se actualizará cuando el usuario vuelva
            timestamp: currentTime,
            endTimestamp: null,
            username: currentUser
          };
          await bridgeJsxServer.addLog(currentUser, inactiveLog);
        }
        
        bridgeJsxServer.saveTimerState(currentUser, {
          time,
          lastUpdate: currentTime,
          wasRunning: true,
          wasPaused: false,
          isActiveTrackingMode,
          lastInactivityStart: currentTime
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, lastActivityStart, currentUser, time, isActiveTrackingMode]);

  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-enter fullscreen when user is selected (optional)
  useEffect(() => {
    if (currentUser && !isFullscreen) {
      // Small delay to ensure UI is ready
      setTimeout(() => {
        enterFullscreen();
      }, 1000);
    }
  }, [currentUser]);

  // Screen saver activation check
  useEffect(() => {
    const checkScreenSaver = () => {
      const now = Date.now();
      const timeSinceInteraction = now - lastInteractionRef.current;
      
      // Activate if no interaction for SCREENSAVER_DELAY
      if (timeSinceInteraction > SCREENSAVER_DELAY && !isScreenSaverActive) {
        setIsScreenSaverActive(true);
        // Initialize random position and velocity
        setScreenSaverPosition({
          x: Math.random() * (window.innerWidth - SCREENSAVER_ELEMENT_SIZE),
          y: Math.random() * (window.innerHeight - SCREENSAVER_ELEMENT_SIZE)
        });
        setScreenSaverVelocity({
          x: (Math.random() > 0.5 ? 1 : -1) * SCREENSAVER_SPEED,
          y: (Math.random() > 0.5 ? 1 : -1) * SCREENSAVER_SPEED
        });
      }
    };

    const interval = setInterval(checkScreenSaver, 1000);
    return () => clearInterval(interval);
  }, [isScreenSaverActive]);

  // Add interaction listeners
  useEffect(() => {
    const handleInteraction = () => {
      lastInteractionRef.current = Date.now();
      if (isScreenSaverActive) {
        dismissScreenSaver();
      }
    };
    
    // Add event listeners for user interaction
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'touchmove',
      'scroll',
      'click',
      'keypress',
      'mousewheel',
      'DOMMouseScroll'
    ];

    events.forEach(event => {
      window.addEventListener(event, handleInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, [isScreenSaverActive]);

  // Screen saver animation
  useEffect(() => {
    if (isScreenSaverActive) {
      const animate = () => {
        setScreenSaverPosition(prev => {
          let newX = prev.x + screenSaverVelocity.x;
          let newY = prev.y + screenSaverVelocity.y;
          let newVelX = screenSaverVelocity.x;
          let newVelY = screenSaverVelocity.y;

          // Bounce off walls
          if (newX <= 0 || newX >= window.innerWidth - SCREENSAVER_ELEMENT_SIZE) {
            newVelX = -newVelX;
            newX = Math.max(0, Math.min(newX, window.innerWidth - SCREENSAVER_ELEMENT_SIZE));
            // Change color on bounce
            setScreenSaverColor(colors[Math.floor(Math.random() * colors.length)]);
          }

          if (newY <= 0 || newY >= window.innerHeight - SCREENSAVER_ELEMENT_SIZE) {
            newVelY = -newVelY;
            newY = Math.max(0, Math.min(newY, window.innerHeight - SCREENSAVER_ELEMENT_SIZE));
            // Change color on bounce
            setScreenSaverColor(colors[Math.floor(Math.random() * colors.length)]);
          }

          setScreenSaverVelocity({ x: newVelX, y: newVelY });

          return { x: newX, y: newY };
        });
      };

      screenSaverIntervalRef.current = setInterval(animate, 16); // ~60fps
      return () => {
        if (screenSaverIntervalRef.current) {
          clearInterval(screenSaverIntervalRef.current);
        }
      };
    }
  }, [isScreenSaverActive, screenSaverVelocity]);

  useEffect(() => {
    let frameId;
    let lastTick = Date.now();

    const updateTimer = () => {
      if (!isRunning || (isActiveTrackingMode && !isPageVisible)) return;

      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;

      setTime(prevTime => {
        const newTime = prevTime + delta;
        bridgeJsxServer.saveTimerState(currentUser, {
          time: newTime,
          lastUpdate: now,
          wasRunning: true,
          wasPaused: false,
          isActiveTrackingMode
        });
        return newTime;
      });
      
      frameId = requestAnimationFrame(updateTimer);
    };

    if (isRunning && (!isActiveTrackingMode || isPageVisible)) {
      const currentTime = Date.now();
      lastTick = currentTime;

      if (!lastActivityStart) {
        setLastActivityStart(currentTime);
        if (!isActiveTrackingMode) {
          setLastInactivityStart(currentTime);
        }
      }

      frameId = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isRunning, currentUser, isActiveTrackingMode, lastActivityStart, lastInactivityStart, isPageVisible]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      const isHidden = document.hidden;
      const currentTime = Date.now();
      setIsPageVisible(!isHidden);

      if (isRunning && isActiveTrackingMode) {
        try {
          if (isHidden) {
            await releaseWakeLock();
            stopKeepAlive();
            
            if (lastActivityStart) {
              const activeDuration = currentTime - lastActivityStart;
              const activeLog = {
                type: 'active',
                duration: activeDuration,
                timestamp: lastActivityStart,
                endTimestamp: currentTime,
                username: currentUser
              };
              
              // First save to local storage as backup
              const currentLogs = await bridgeJsxServer.getLogs(currentUser);
              const updatedLogs = [...currentLogs, activeLog];
              localStorage.setItem(`backup_logs_${currentUser}`, JSON.stringify(updatedLogs));
              
              // Then try to save to server
              await bridgeJsxServer.addLog(currentUser, activeLog);
              setActivityLogs(prev => [...prev, activeLog]);
              setActiveTime(prev => prev + activeDuration);
              
              setLastActivityStart(null);
              setLastInactivityStart(currentTime);
            }
          } else {
            await reacquireWakeLock();
            startKeepAlive();
            
            if (lastInactivityStart) {
              const inactiveDuration = currentTime - lastInactivityStart;
              const inactiveLog = {
                type: 'inactive',
                duration: inactiveDuration,
                timestamp: lastInactivityStart,
                endTimestamp: currentTime,
                username: currentUser
              };
              
              // First save to local storage as backup
              const currentLogs = await bridgeJsxServer.getLogs(currentUser);
              const updatedLogs = [...currentLogs, inactiveLog];
              localStorage.setItem(`backup_logs_${currentUser}`, JSON.stringify(updatedLogs));
              
              // Then try to save to server
              await bridgeJsxServer.addLog(currentUser, inactiveLog);
              setActivityLogs(prev => [...prev, inactiveLog]);
              setInactiveTime(prev => prev + inactiveDuration);
              
              setLastActivityStart(currentTime);
              setLastInactivityStart(null);
            }
          }
        } catch (error) {
          console.error('Error handling visibility change:', error);
          // If there was an error, we'll try to recover from local storage backup later
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', reacquireWakeLock);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', reacquireWakeLock);
      releaseWakeLock();
      stopKeepAlive();
    };
  }, [isRunning, isActiveTrackingMode, lastActivityStart, currentUser, lastInactivityStart]);


// < -------------------------------------- HTML PRINCIPAL -------------------------------------- >

  if (!currentUser) {
    return <UserSelector onUserSelect={handleUserSelect} />
  }

  return (
    <div className="app-container">
      {/* Hidden video element */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        loop
        muted
        playsInline
      >
        <source src="/silent.mp4" type="video/mp4" />
      </video>

      <div className="user-info">
        <h2>Usuario: {currentUser}</h2>
        <div className="user-controls">
          <HelpPopup />
          <button 
            className="fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? '⮄' : '⮀'}
          </button>
          <button 
            className="change-user-btn"
            onClick={() => handleUserSelect(null)}
          >
            Cambiar Usuario
          </button>
        </div>
      </div>

      <div className="timer-container">
        <h1>Cronómetro</h1>
        <div className="mode-selector">
          <label className="mode-toggle">
            <input
              type="checkbox"
              checked={isActiveTrackingMode}
              onChange={toggleTrackingMode}
            />
            <span className="mode-label">
              {isActiveTrackingMode ? 'Modo de Seguimiento Activo' : 'Modo Cronómetro Normal'}
            </span>
          </label>
        </div>
        <div className="timer-display">{formatTime(time)}</div>
        <div className="timer-status">
          {!isPageVisible && isRunning && (
            <p className="warning">El cronómetro sigue corriendo en segundo plano</p>
          )}
        </div>
        <div className="timer-controls">
          {!isRunning ? (
            <button onClick={handleStart} className="start-button">Iniciar</button>
          ) : (
            <button onClick={handleStop} className="stop-button">Pausar</button>
          )}
          <button onClick={handleReset} className="reset-button">Reiniciar</button>
          <button onClick={toggleLogs} className="logs-button">
            {showLogs ? 'Ocultar Logs' : 'Mostrar Logs'}
          </button>
        </div>
      </div>

      {showLogs && (
        <div className="logs-container">
          <h2>Estadísticas de Actividad</h2>
          
          <ActivityCharts logs={activityLogs} username={currentUser} />

          <div className="activity-summary">
            <p>Tiempo total activo: {formatTime(activeTime)}</p>
            <p>Tiempo total inactivo: {formatTime(inactiveTime)}</p>
          </div>

          <h3>Registro de Actividad</h3>
          <div className="activity-logs">
            {activityLogs
              .filter(log => log.username === currentUser)
              .slice()
              .reverse()
              .map((log, index) => (
                <div key={index} className={`log-entry ${log.type}`}>
                  <span className="log-type">
                    {log.type === 'active' ? '✓ Activo' : '✗ Inactivo'}
                  </span>
                  <span className="log-duration">
                    {formatTime(log.duration)}
                  </span>
                  <span className="log-time">
                    {new Date(log.timestamp).toLocaleTimeString()} - {new Date(log.endTimestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Screen Saver */}
      {isScreenSaverActive && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            cursor: 'pointer'
          }}
          onClick={() => {
            lastInteractionRef.current = Date.now();
            setIsScreenSaverActive(false);
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${screenSaverPosition.x}px`,
              top: `${screenSaverPosition.y}px`,
              width: `${SCREENSAVER_ELEMENT_SIZE}px`,
              height: `${SCREENSAVER_ELEMENT_SIZE}px`,
              backgroundColor: screenSaverColor,
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '14px',
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
              transition: 'background-color 0.3s ease'
            }}
          >
            <div style={{ fontSize: '18px', marginBottom: '5px' }}>
              {formatTime(time)}
            </div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>
              {currentUser || 'Timer'}
            </div>
          </div>
          
          {/* Instructions - positioned relative to bouncing element */}
          <div
            style={{
              position: 'absolute',
              left: `${screenSaverPosition.x}px`,
              top: `${screenSaverPosition.y + SCREENSAVER_ELEMENT_SIZE + 20}px`,
              color: '#fff',
              fontSize: '12px',
              opacity: 0.6,
              textAlign: 'center',
              width: `${SCREENSAVER_ELEMENT_SIZE}px`,
              whiteSpace: 'nowrap',
              overflow: 'visible'
            }}
          >
            <div style={{ marginBottom: '5px' }}>
              Protector de pantalla
            </div>
            <div style={{ fontSize: '10px' }}>
              Toca para salir
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
