// Este componente es literalmente texto plano que sacas cuando le das 
// al boton de ayuda, no tiene mucha mas lógica la vdd

// Estilos usados:
// - HelpPopup.css

import React, { useState } from 'react';
import '../../styles/components/HelpPopup.css';

export function HelpPopup() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="help-container">
      <button className="help-button" onClick={() => setIsOpen(true)}>
        ¿Cómo funciona?
      </button>

      {isOpen && (
        <div className="popup-overlay" onClick={() => setIsOpen(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <h2>¿Cómo funciona TrackerEstudio?</h2>
            
            <section>
              <h3>Modos de Funcionamiento</h3>
              <p>El cronómetro tiene dos modos de operación:</p>
              <ul>
                <li><strong>Modo de Seguimiento Activo:</strong> Solo registra el tiempo cuando estás activamente en la página web. Si cambias de pestaña o minimizas la ventana, el tiempo se detendrá.</li>
                <li><strong>Modo Cronómetro Normal:</strong> Funciona como un cronómetro tradicional, continuando la cuenta incluso cuando cambias de pestaña o minimizas la ventana.</li>
              </ul>
            </section>

            <section>
              <h3>Funciones Principales</h3>
              <ul>
                <li><strong>Iniciar/Pausar:</strong> Controla el cronómetro.</li>
                <li><strong>Reiniciar:</strong> Vuelve el cronómetro a cero.</li>
                <li><strong>Registros:</strong> Muestra/oculta el historial de actividad.</li>
                <li><strong>Limpiar Registros:</strong> Elimina todo el historial de actividad.</li>
              </ul>
            </section>

            <section>
              <h3>Guardado de Datos</h3>
              <p>La aplicación guarda automáticamente:</p>
              <ul>
                <li>El tiempo transcurrido</li>
                <li>Los períodos de actividad e inactividad</li>
                <li>Las preferencias de modo de funcionamiento</li>
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
