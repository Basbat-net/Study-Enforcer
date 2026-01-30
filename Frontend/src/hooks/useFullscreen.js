// Gestion de la pantalla completa

// Returns:
//  isFullscreen, // booleano de si está o no
//  enterFullscreen, // Funcion entrar
//  exitFullscreen, // Funcion salir
//  toggleFullscreen // Funcion toggle

// Funciones importantes:
// - enterFullscreen: entrar en fullScreen
// - exitFullscreen: salir de fullScreen
// - toggleFullscreen: togglear fullScreen

// useEffects:
// Donde realmente se ejecutan las fucniones, se ejecuta una vez y crea eventListeners

import { useState, useEffect } from 'react';

// Entrar fullScreen
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

// Salir fullScreen
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

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle fullscreen 
  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  };


  // IMPORTANTE: Esto solo corre una vez, y crea eventListeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    // Estos son los que realmente crean los eventListeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      // Para cuando se cierra todo
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen
  };
}
