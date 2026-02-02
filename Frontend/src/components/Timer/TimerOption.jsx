import { useEffect, useState } from 'react';

// Components (used by Timer option)
import { UserSelector } from '../UserSelector';
import { ActivityCharts } from './ActivityCharts';
import { HelpPopup } from './HelpPopup';
import { ScreenSaver } from './ScreenSaver';
import { ModeSelector } from './ModeSelector';

// Hooks
import { useTimer } from '../../hooks/useTimer';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useScreenSaver } from '../../hooks/useScreenSaver';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useActivityLogs } from '../../hooks/useActivityLogs';

// Services
import { ApiService } from '../../services/api';

// Utils
import { formatTime } from '../../utils/timeUtils';

export function TimerOption({ currentUser, onUserSelect }) {
  // Cosas para el tracking
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isActiveTrackingMode, setIsActiveTrackingMode] = useState(true);

  // IMPORTANTE: Estos valores no son estaticos, son referencias para los valores actuales de los hooks
  const timer = useTimer(currentUser, isActiveTrackingMode, isPageVisible);
  const wakeLock = useWakeLock(timer.isRunning);
  const screenSaver = useScreenSaver();
  const fullscreen = useFullscreen();
  const logs = useActivityLogs(currentUser);

  // Format time for display
  const formattedTime = formatTime(timer.time);

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
      lastInactivityStartTime: !isActiveTrackingMode ? currentTime : null,
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
        username: currentUser,
      };
      await logs.addLog(logEntry);
    }

    timer.setLastActivityStart(null);
    timer.setLastInactivityStart(null);

    await timer.saveState({
      wasPaused: true,
      wasRunning: false,
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
          username: currentUser,
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
      lastInactivityStartTime: null,
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
        username: currentUser,
      };
      await logs.addLog(logEntry);
    }

    const newMode = !isActiveTrackingMode;
    setIsActiveTrackingMode(newMode);
    timer.setLastActivityStart(timer.isRunning ? currentTime : null);

    await timer.saveState({
      wasRunning: timer.isRunning,
      wasPaused: !timer.isRunning,
      isActiveTrackingMode: newMode,
    });
  };

  // Inicializa todas las cosas al seleccionar un usuario o cambiar
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
        username: currentUser,
      };
      await logs.addLog(logEntry);
    }

    if (typeof onUserSelect === 'function') {
      onUserSelect(username);
    }
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
        await timer.saveState(
          {
            time: 0,
            wasRunning: false,
            wasPaused: true,
            isActiveTrackingMode: true,
          },
          username,
        );
      }
    } else {
      timer.setTime(0);
      setIsActiveTrackingMode(true);
    }
  };

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
        // eslint-disable-next-line no-console
        console.error('Error loading user state:', error);
      }
    })();
  }, [currentUser]);

  // pendiente de que te salgas de la pagina
  useEffect(() => {
    const handleVisibilityChange = async () => {
      const isHidden = document.hidden;
      const currentTime = Date.now();
      setIsPageVisible(!isHidden);

      if (timer.isRunning && isActiveTrackingMode) {
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
                username: currentUser,
              };

              await logs.addLog(activeLog);
              timer.setLastActivityStart(null);
              timer.setLastInactivityStart(currentTime);
            }
          } else {
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
                username: currentUser,
              };

              await logs.addLog(inactiveLog);
              timer.setLastActivityStart(currentTime);
              timer.setLastInactivityStart(null);
            }
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error handling visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [
    timer.isRunning,
    isActiveTrackingMode,
    timer.lastActivityStart,
    timer.lastInactivityStart,
    currentUser,
  ]);

  // antes de cerrar la pagina, guarda todo y salta un aviso para cerrar la pagina
  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      if (timer.isRunning) {
        event.preventDefault();
        event.returnValue = '';

        const currentTime = Date.now();

        if (timer.lastActivityStart && isActiveTrackingMode) {
          const duration = currentTime - timer.lastActivityStart;
          const activeLog = {
            type: 'active',
            duration,
            timestamp: timer.lastActivityStart,
            endTimestamp: currentTime,
            username: currentUser,
          };
          await logs.addLog(activeLog);
        }

        await timer.saveState({
          wasRunning: true,
          wasPaused: false,
          lastInactivityStart: currentTime,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timer.isRunning, timer.lastActivityStart, currentUser, timer.time, isActiveTrackingMode]);

  // Se mete en pantalla completa automaticamente al seleccionar el usuario
  useEffect(() => {
    if (currentUser && !fullscreen.isFullscreen) {
      setTimeout(() => {
        fullscreen.enterFullscreen();
      }, 1000);
    }
  }, [currentUser]);

  // Guarda el estado del timer cada 5 segundos
  useEffect(() => {
    if (timer.isRunning && currentUser) {
      const saveInterval = setInterval(async () => {
        await timer.saveState({
          wasRunning: true,
          wasPaused: false,
        });
      }, 5000);

      return () => clearInterval(saveInterval);
    }
  }, [timer.isRunning, timer.time, currentUser, isActiveTrackingMode, timer.saveState]);

  // Si no hay usuario, muestra la pagina de cambio de usuario
  if (!currentUser) {
    return <UserSelector onUserSelect={handleUserSelect} />;
  }

  return (
    <div className="app-container">
      {/* Hidden video element for wake lock fallback */}
      <video ref={wakeLock.videoRef} style={{ display: 'none' }} loop muted playsInline>
        <source src="/silent.mp4" type="video/mp4" />
      </video>

      {/* El div de arriba con el usuario y los botones */}
      <div className="user-info">
        <h2>{currentUser}</h2>
        <div className="user-controls">
          <HelpPopup />
          <button
            className="fullscreen-btn"
            onClick={fullscreen.toggleFullscreen}
            title={fullscreen.isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {fullscreen.isFullscreen ? '⮄' : '⮀'}
          </button>
          <button className="change-user-btn" onClick={() => handleUserSelect(null)}>
            Cambiar Usuario
          </button>
        </div>
      </div>

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
            <button onClick={handleTimerStart} className="start-button">
              Iniciar
            </button>
          ) : (
            <button onClick={handleTimerStop} className="stop-button">
              Pausar
            </button>
          )}
          <button onClick={handleTimerReset} className="reset-button">
            Reiniciar
          </button>
          <button onClick={logs.toggleLogs} className="logs-button">
            {logs.showLogs ? 'Ocultar Logs' : 'Mostrar Logs'}
          </button>
        </div>
      </div>

      {logs.showLogs && (
        <div className="logs-container">
          <h2>Estadísticas de Actividad</h2>
          <ActivityCharts logs={logs.activityLogs} username={currentUser} />
          <div className="activity-summary">
            <p>Tiempo total activo: {formatTime(logs.activeTime)}</p>
            <p>Tiempo total inactivo: {formatTime(logs.inactiveTime)}</p>
          </div>

          <h3>Registro de Actividad</h3>
          <div className="activity-logs">
            {logs.activityLogs
              .filter((log) => log.username === currentUser)
              .slice()
              .reverse()
              .map((log, index) => (
                <div key={index} className={`log-entry ${log.type}`}>
                  <span className="log-type">{log.type === 'active' ? '✓ Activo' : '✗ Inactivo'}</span>
                  <span className="log-duration">{formatTime(log.duration)}</span>
                  <span className="log-time">
                    {new Date(log.timestamp).toLocaleTimeString()} -{' '}
                    {new Date(log.endTimestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

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

