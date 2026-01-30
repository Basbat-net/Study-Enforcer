// El fokin cuadrao que rebota
// para ver más lógica, se expande en useScreenSaver.js

// Estilos usados:
// - ScreenSaver.css

import React from 'react';
import '../../styles/components/ScreenSaver.css';

export function ScreenSaver({ 
  isActive, 
  position, 
  color, 
  elementSize, 
  formattedTime, 
  currentUser, 
  onDismiss 
}) {
  if (!isActive) return null;

  return (
    <div 
      className="screensaver-overlay"
      onClick={onDismiss}
    >
      <div
        className="screensaver-element"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${elementSize}px`,
          height: `${elementSize}px`,
          backgroundColor: color,
        }}
      >
        <div className="screensaver-time">
          {formattedTime}
        </div>
        <div className="screensaver-user">
          {currentUser || 'Timer'}
        </div>
      </div>
      
      {/* Instructions - positioned relative to bouncing element */}
      <div
        className="screensaver-instructions"
        style={{
          left: `${position.x}px`,
          top: `${position.y + elementSize + 20}px`,
          width: `${elementSize}px`,
        }}
      >
        <div className="screensaver-title">
          Protector de pantalla
        </div>
        <div className="screensaver-hint">
          Toca para salir
        </div>
      </div>
    </div>
  );
}
