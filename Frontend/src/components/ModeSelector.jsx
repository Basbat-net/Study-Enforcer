// El boton de si quieres el modo de tracking activo o no

// Estilos usados:
// - ModeSelector.css

import React from 'react';
import '../../styles/components/ModeSelector.css';

export function ModeSelector({ isActiveTrackingMode, onToggle, disabled }) {
  return (
    <div className="mode-selector">
      <label className="mode-toggle">
        <input
          type="checkbox"
          checked={isActiveTrackingMode}
          onChange={onToggle}
          disabled={disabled}
        />
        <span className="mode-label">
          {isActiveTrackingMode ? 'Modo de Seguimiento Activo' : 'Modo Cronómetro Normal'}
        </span>
      </label>
    </div>
  );
}
