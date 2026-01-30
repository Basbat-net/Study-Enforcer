// Trucos y baratijas para asegurar que no se apague la pantalla juju

// Gestion del Wake Lock para prevenir que la pantalla se apague durante tracking

// Inputs:
// - isRunning: boolean (indica si el timer está corriendo o no)

// Returns:
//  requestWakeLock, // Intentar activar el Wake Lock
//  releaseWakeLock, // Liberar el Wake Lock manualmente
//  reacquireWakeLock, // Reintentar adquirir el Wake Lock si se pierde
//  startKeepAlive, // Iniciar keep alive (intervalo para reacquirir el Wake Lock)
//  stopKeepAlive, // Parar el keep alive
//  startVideoPlayback, // Iniciar playback oculto de video como fallback en navegadores donde Wake Lock no funciona
//  stopVideoPlayback // Parar el playback oculto de video

// useCallBacks:
// - requestWakeLock: solicita el Wake Lock al navegador (si se soporta)
// - releaseWakeLock: libera el Wake Lock si está activo
// - reacquireWakeLock: (callback/manual) intenta reasignar el Wake Lock si se ha perdido
// - startKeepAlive: inicia un intervalo que llama periódicamente a reacquireWakeLock para mantener el Wake Lock activo
// - stopKeepAlive: elimina el intervalo de keep alive
// - startVideoPlayback: (fallback) inicia un pequeño video oculto para mantener el dispositivo activo en navegadores problemáticos
// - stopVideoPlayback: para y elimina el video oculto

// useEffects:
// Donde se declaran los eventListeners


import { useRef, useCallback, useEffect } from 'react';

export function useWakeLock(isRunning) {
  const wakeLockRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);
  const videoRef = useRef(null);

  // Se intenta activar el wake lock
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock is active');
        
        // En caso de que falle salta un log y pone el wakeLock en null para
        // que intente reconseguirlo
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock was released');
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      console.error(`Wake Lock request failed: ${err.name}, ${err.message}`);
    }
  }, []);

  // intenta pillar el wakeLick
  const reacquireWakeLock = useCallback(async () => {
    // solo se ejecuta si ya no lo tiene
    if (isRunning && !document.hidden && (!wakeLockRef.current || wakeLockRef.current.released)) {
      console.log('Attempting to reacquire wake lock...');
      await requestWakeLock();
    }
  }, [isRunning, requestWakeLock]);

  // Lo libera para cuando se sale de la web
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock released');
      } catch (err) {
        console.error(`Wake Lock release failed: ${err.name}, ${err.message}`);
      }
    }
  }, []);

  // Keepalive para backend
  const startKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) return;
    
    keepAliveIntervalRef.current = setInterval(async () => {
      try {
        // Send a ping to the server every 30 seconds
        await fetch(`${window.location.origin}/api/ping`);
      } catch (error) {
        console.error('Keep-alive ping failed:', error);
      }
    }, 30000); // 30 seconds
  }, []);

  // lo mata 
  const stopKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }, []);


  // Esta parte es porque en algun momento, el keepalive no funcionaba, y vi que si ponias 
  // un video el keepalive funcionaba. En teoria deberia ser suficiente con el keepalive, pero por
  // cuestiones de seguridad, se deja el video de backup (no se si quitarlo)
  const startVideoPlayback = useCallback(async () => {
    if (videoRef.current) {
      try {
        videoRef.current.playbackRate = 0.1; // Slow down playback
        videoRef.current.volume = 0; // Ensure it's muted
        await videoRef.current.play();
        console.log('Video playback started');
      } catch (error) {
        console.error('Error playing video:', error);
      }
    }
  }, []);

  const stopVideoPlayback = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      console.log('Video playback stopped');
    }
  }, []);

  // useEffect 1
  // donde se ponen los eventListeners
  useEffect(() => {
    // este trigger aparece cuadno o entras a la web o vuelves a la pestaña
    window.addEventListener('focus', reacquireWakeLock);
    
    return () => {
      window.removeEventListener('focus', reacquireWakeLock);
      releaseWakeLock();
      stopKeepAlive();
    };
  }, [reacquireWakeLock, releaseWakeLock, stopKeepAlive]);

  return {
    videoRef,
    requestWakeLock,
    releaseWakeLock,
    reacquireWakeLock,
    startKeepAlive,
    stopKeepAlive,
    startVideoPlayback,
    stopVideoPlayback
  };
}
