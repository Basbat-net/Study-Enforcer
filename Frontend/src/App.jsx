// Este codigo es en el que se montan el resto de componentes y hooks

// Funciones importantes:
// - handleTimerStart: se ejecuta al pulsar inciar
// - handleTimerStop: se ejecuta al pulsar parar
// - handleTimerReset: se ejecuta al pulsar reiniciar
// - toggleTrackingMode: se ejecuta al pulsar cambiar el modo de tracking
// - handleUserSelect: se ejecuta al seleccionar un usuario o cambiar a null

// useEffects importantes:
// - useEffect1: se ejecuta cuando cambia el usuario
// - useEffect2: se ejecuta cuando te salgas de la pagina
// - useEffect3: se ejecuta antes de cerrar la pagina
// - useEffect4: se ejecuta cuando cambia la pantalla completa
// - useEffect5: se ejecuta cada 5 segundos para guardar el estado del timer

// componentes importantes:
// - ActivityCharts: el componente que te muestra el grafico de barras
// - HelpPopup: el componente que te muestra el popup de ayuda
// - ScreenSaver: el componente que te muestra el salvapantallas
// - ModeSelector: el componente que te deja cambiar el modo de tracking

import { useState, useEffect} from 'react';

// < -------------------------------------- IMPORTS -------------------------------------- >
// Components
import { UserSelector } from './components/UserSelector';
import { ActivityCharts } from './components/ActivityCharts';
import { HelpPopup } from './components/HelpPopup';
import { ScreenSaver } from './components/ScreenSaver';
import { ModeSelector } from './components/ModeSelector';

// Hooks
import { useTimer } from './hooks/useTimer';
import { useWakeLock } from './hooks/useWakeLock';
import { useScreenSaver } from './hooks/useScreenSaver';
import { useFullscreen } from './hooks/useFullscreen';
import { useActivityLogs } from './hooks/useActivityLogs';

// Services
import { ApiService } from './services/api';

// Utils
import { formatTime } from './utils/timeUtils';

// Styles
import '../styles/App.css';
import '../styles/components/ActivityCharts.css';

// < -------------------------------------- APP COMPONENT -------------------------------------- >

export default function App() {

  // < -------------------------------------- DECLARACIONES ------------------------------------- >
  
  // Usuario 
  const [currentUser, setCurrentUser] = useState(null);
  // Cosas para el tracking
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isActiveTrackingMode, setIsActiveTrackingMode] = useState(true);

  // IMPORTANTE: Estos valores no son estaticos, son referencias para los valores actuales de los hooks 

  // Todos estos hooks se llaman desde Frontend/src/hooks/(nombre hook).js
  const timer = useTimer(currentUser, isActiveTrackingMode, isPageVisible);
  const wakeLock = useWakeLock(timer.isRunning);
  const screenSaver = useScreenSaver();
  const fullscreen = useFullscreen();
  const logs = useActivityLogs(currentUser);

  // Format time for display
  const formattedTime = formatTime(timer.time);

  // < -------------------------------------- HANDLERS -------------------------------------- >

  // IMPORTANTE: Los handle solo funcionan despues de un tiempo de quitar el screenSaver
  // Se ejecuta al pulsar inciar
  const handleTimerStart = async () => {
    if (screenSaver.isJustDismissed) return;
    
    const currentTime = Date.now();
    timer.setIsRunning(true);
    timer.setLastActivityStart(currentTime);
    if (!isActiveTrackingMode) {
      timer.setLastInactivityStart(currentTime);
    }
    
    await wakeLock.requestWakeLock();
    wakeLock.startKeepAlive();
    wakeLock.startVideoPlayback();
    
    await timer.saveState({
      wasPaused: false,
      wasRunning: true,
      lastInactivityStartTime: !isActiveTrackingMode ? currentTime : null
    });
  };

  // Se ejecuta al pulsar parar
  const handleTimerStop = async () => {
    if (screenSaver.isJustDismissed) return;
    
    const currentTime = Date.now();
    timer.setIsRunning(false);

    await wakeLock.releaseWakeLock();
    wakeLock.stopKeepAlive();
    wakeLock.stopVideoPlayback();

    if (timer.lastActivityStart) {
      const duration = currentTime - timer.lastActivityStart;
      const logEntry = {
        type: isActiveTrackingMode ? 'active' : 'inactive',
        duration,
        timestamp: timer.lastActivityStart,
        endTimestamp: currentTime,
        username: currentUser
      };
      await logs.addLog(logEntry);
    }

    timer.setLastActivityStart(null);
    timer.setLastInactivityStart(null);

    await timer.saveState({
      wasPaused: true,
      wasRunning: false
    });
  };

  // Se ejecuta al pulsar reiniciar
  const handleTimerReset = async () => {
    if (screenSaver.isJustDismissed) return;
    const currentTime = Date.now();
    
    if (timer.isRunning) {
      timer.setIsRunning(false);
      await wakeLock.releaseWakeLock();
      wakeLock.stopKeepAlive();
      wakeLock.stopVideoPlayback();

      if (timer.lastActivityStart) {
        const duration = currentTime - timer.lastActivityStart;
        const logEntry = {
          type: isActiveTrackingMode ? 'active' : 'inactive',
          duration,
          timestamp: timer.lastActivityStart,
          endTimestamp: currentTime,
          username: currentUser
        };
        await logs.addLog(logEntry);
      }
    }
    
    timer.reset();
    timer.setTime(0);
    
    await timer.saveState({
      time: 0,
      wasPaused: true,
      wasRunning: false,
      lastInactivityStartTime: null
    });
  };

  // Cambia el modo de tracking
  const toggleTrackingMode = async () => {
    if (screenSaver.isJustDismissed) return;
    
    const currentTime = Date.now();
    
    // If switching modes while timer is running, log the current interval
    if (timer.isRunning && timer.lastActivityStart) {
      const duration = currentTime - timer.lastActivityStart;
      const logEntry = {
        type: 'active',
        duration,
        timestamp: timer.lastActivityStart,
        endTimestamp: currentTime,
        username: currentUser
      };
      await logs.addLog(logEntry);
    }

    const newMode = !isActiveTrackingMode;
    setIsActiveTrackingMode(newMode);
    timer.setLastActivityStart(timer.isRunning ? currentTime : null);
    
    await timer.saveState({
      wasRunning: timer.isRunning,
      wasPaused: !timer.isRunning,
      isActiveTrackingMode: newMode
    });
  };

  // Inicializa todas las cosas al seleccionar un usuario o cambiar
  // si se le pasa con null, se le devuelve con el if del principio de renders
  // a la pagina de seleccion
  const handleUserSelect = async (username) => {
    const currentTime = Date.now();

    // Si cambia durante se guarda el tiempo
    if (currentUser && timer.isRunning && timer.lastActivityStart) {
      const duration = currentTime - timer.lastActivityStart;
      const logEntry = {
        type: isActiveTrackingMode ? 'active' : 'inactive',
        duration,
        timestamp: timer.lastActivityStart,
        endTimestamp: currentTime,
        username: currentUser
      };
      await logs.addLog(logEntry);
    }

    setCurrentUser(username);
    timer.setIsRunning(false);
    timer.setLastActivityStart(null);
    timer.setLastInactivityStart(null);
    
    if (username) {
      // Load user's timer state using hook method
      const timerState = await timer.loadTimerState(username);
      if (timerState && timerState.time) {
        setIsActiveTrackingMode(timerState.isActiveTrackingMode ?? true);
      } else {
        setIsActiveTrackingMode(true);
        await timer.saveState({
          time: 0,
          wasRunning: false,
          wasPaused: true,
          isActiveTrackingMode: true
        }, username);
      }
    } else {
      timer.setTime(0);
      setIsActiveTrackingMode(true);
    }
  };

  // < -------------------------------------- EFFECTS -------------------------------------- >

  // useEffect1
  // Cuando cambia el usuario, carga todas las cosas pertinentes
  useEffect(() => {
    if (!currentUser) return;

    const currentTime = Date.now();

    (async () => {
      try {
        // termina los inactiveIntervals que tenga
        const { inactiveLog } = await ApiService.endInactiveInterval(currentUser, currentTime);

        // Guarda los logs
        let userLogs = await ApiService.getLogs(currentUser);

        if (inactiveLog) {
          userLogs = [...userLogs, inactiveLog];
          await ApiService.saveLogs(currentUser, userLogs);
        }

        logs.setActivityLogs(userLogs);

        // calcula los totales para el grafico
        const totals = logs.calculateTotals(userLogs);
        logs.setActiveTime(totals.active);
        logs.setInactiveTime(totals.inactive);

        // reinicia el timer desde lo que estaba guardado
        const timerState = await timer.loadTimerState(currentUser);
        if (timerState) {
          setIsActiveTrackingMode(timerState.isActiveTrackingMode ?? true);
        }
      } catch (error) {
        console.error('Error loading user state:', error);
      }
    })();
  }, [currentUser]); // solo se ejecuta si cambia el currentUser

  // useEffect2
  // es el useEffect que está pendiente de que te salgas de la pagina
  // corre y deja puesto un eventListener
  useEffect(() => {
    const handleVisibilityChange = async () => {
      const isHidden = document.hidden;
      const currentTime = Date.now();
      setIsPageVisible(!isHidden);

      if (timer.isRunning && isActiveTrackingMode) {
        // si está corriendo y el modo es activo, corta el activo y pone un inactivo
        try {
          if (isHidden) {
            await wakeLock.releaseWakeLock();
            wakeLock.stopKeepAlive();
            
            // corta el activo
            if (timer.lastActivityStart) {
              const duration = currentTime - timer.lastActivityStart;
              const activeLog = {
                type: 'active',
                duration,
                timestamp: timer.lastActivityStart,
                endTimestamp: currentTime,
                username: currentUser
              };
              
              await logs.addLog(activeLog);
              timer.setLastActivityStart(null);
              timer.setLastInactivityStart(currentTime);
              // empieza un intervalo de inactividad
            }
          } else {
            // si no está corriendo y el modo es activo, empieza un activo
            await wakeLock.reacquireWakeLock();
            wakeLock.startKeepAlive();
            // si hay un intervalo de inactividad, corta el inactivo y pone un activo
            if (timer.lastInactivityStart) {
              const duration = currentTime - timer.lastInactivityStart;
              const inactiveLog = {
                type: 'inactive',
                duration,
                timestamp: timer.lastInactivityStart,
                endTimestamp: currentTime,
                username: currentUser
              };
              
              await logs.addLog(inactiveLog);
              timer.setLastActivityStart(currentTime); // empieza un activo
              timer.setLastInactivityStart(null); // termina el inactivo
            }
          }
        } catch (error) {
          console.error('Error handling visibility change:', error);
        }
      }
    };

    // el listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timer.isRunning, isActiveTrackingMode, timer.lastActivityStart, timer.lastInactivityStart, currentUser]);

  // useEffect3
  // antes de cerrar la pagina, guarda todo y salta un aviso para cerrar la pagina
  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      if (timer.isRunning) {
        // saca un warning para intentar que no cierre la pagina
        event.preventDefault();
        event.returnValue = '';
        
        const currentTime = Date.now();

        // guarda el activeInterval para que vuelva en otro momento
        if (timer.lastActivityStart && isActiveTrackingMode) {
          const duration = currentTime - timer.lastActivityStart;
          const activeLog = {
            type: 'active',
            duration,
            timestamp: timer.lastActivityStart,
            endTimestamp: currentTime,
            username: currentUser
          };
          await logs.addLog(activeLog);
        }
        
        // se guarda el estado del timer
        await timer.saveState({
          wasRunning: true,
          wasPaused: false,
          lastInactivityStart: currentTime
        });
      }
    };

    // se carga solo al principio o cuando cambia algo, y se escucha a beforeUnload
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timer.isRunning, timer.lastActivityStart, currentUser, timer.time, isActiveTrackingMode]);

  // useEffect4
  // Se mete en pantalla completa automaticamente al seleccionar el usuario
  useEffect(() => {
    if (currentUser && !fullscreen.isFullscreen) {
      setTimeout(() => {
        fullscreen.enterFullscreen();
      }, 1000);
    }
  }, [currentUser]);

  // useEffect5
  // Guarda el estado del timer cada 5 segundos, y la api se encarga de 
  // guardar el tiempo en el servidor
  // va por un setInterval que se regenera si cambia algo de la dependency array
  useEffect(() => {
    if (timer.isRunning && currentUser) {
      const saveInterval = setInterval(async () => {
        await timer.saveState({
          wasRunning: true,
          wasPaused: false
        });
      }, 5000); // Save every 5 seconds

      return () => clearInterval(saveInterval);
    }
  }, [timer.isRunning, timer.time, currentUser, isActiveTrackingMode, timer.saveState]);

  // < -------------------------------------- RENDER -------------------------------------- >

  // Si no hay usuario, muestra la pagina de cambio de usuario
  if (!currentUser) {
    return <UserSelector onUserSelect={handleUserSelect} />;
  }

  return (
    <div className="app-container">
      {/* Hidden video element for wake lock fallback */}
      <video
        ref={wakeLock.videoRef}
        style={{ display: 'none' }}
        loop
        muted
        playsInline
      >
        <source src="/silent.mp4" type="video/mp4" />
      </video>

      {/* El div de arriba con el usuario y los botones */}
      <div className="user-info">
        <h2>Usuario: {currentUser}</h2>
        <div className="user-controls">
          <HelpPopup />
          <button 
            className="fullscreen-btn"
            onClick={fullscreen.toggleFullscreen}
            title={fullscreen.isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {fullscreen.isFullscreen ? '⮄' : '⮀'}
          </button>
          <button 
            className="change-user-btn"
            onClick={() => handleUserSelect(null)}
          >
            Cambiar Usuario
          </button>
        </div>
      </div>
      {/* el div del cronometro*/}

      <div className="timer-container">
        <h1>Cronómetro</h1>
        <ModeSelector 
          isActiveTrackingMode={isActiveTrackingMode}
          onToggle={toggleTrackingMode}
          disabled={screenSaver.isJustDismissed}
        />
        <div className="timer-display">{formattedTime}</div>
        <div className="timer-status">
          {!isPageVisible && timer.isRunning && (
            <p className="warning">El cronómetro sigue corriendo en segundo plano</p>
          )}
        </div>
        <div className="timer-controls">
          {!timer.isRunning ? (
            <button onClick={handleTimerStart} className="start-button">Iniciar</button>
          ) : (
            <button onClick={handleTimerStop} className="stop-button">Pausar</button>
          )}
          <button onClick={handleTimerReset} className="reset-button">Reiniciar</button>
          <button onClick={logs.toggleLogs} className="logs-button">
            {logs.showLogs ? 'Ocultar Logs' : 'Mostrar Logs'}
          </button>
        </div>
      </div>

      {/* el div del cronometro (solo sale si logs.showLogs es true)*/}
      {logs.showLogs && (
        <div className="logs-container">
          <h2>Estadísticas de Actividad</h2>
          {/* el grafico de barras*/}
          <ActivityCharts logs={logs.activityLogs} username={currentUser} />
          {/* div de los totales (tiempo activo y inactivo)*/}
          <div className="activity-summary">
            <p>Tiempo total activo: {formatTime(logs.activeTime)}</p>
            <p>Tiempo total inactivo: {formatTime(logs.inactiveTime)}</p>
          </div>

          <h3>Registro de Actividad</h3>
          {/* La lista de los logs*/}
          <div className="activity-logs">
            {logs.activityLogs
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
              {/*Lo de dentro del map es cada logEntry*/}
          </div>
        </div>
      )}

      {/* Screen Saver */}
      <ScreenSaver
        isActive={screenSaver.isActive}
        position={screenSaver.position}
        color={screenSaver.color}
        elementSize={screenSaver.ELEMENT_SIZE}
        formattedTime={formattedTime}
        currentUser={currentUser}
        onDismiss={screenSaver.dismiss}
      />
    </div>
  );
}
