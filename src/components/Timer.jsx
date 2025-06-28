import { useState, useEffect, useCallback, useRef } from 'react';
import { formatTime } from '../utils/timeUtils';
import '../styles/Timer.css';

export function Timer({ onLogActivity }) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(null);
  const lastUpdateRef = useRef(0);
  const animationFrameRef = useRef(null);

  const startNewInterval = useCallback(() => {
    const now = new Date();
    const newInterval = {
      timestamp: now.toISOString(),
      type: 'active',
    };
    setCurrentInterval(newInterval);
    lastUpdateRef.current = performance.now();
    return newInterval;
  }, []);

  const endCurrentInterval = useCallback(() => {
    if (currentInterval) {
      const endTime = new Date();
      const startTimeDate = new Date(currentInterval.timestamp);
      const duration = endTime - startTimeDate;
      
      onLogActivity({
        ...currentInterval,
        endTimestamp: endTime.toISOString(),
        duration: duration
      });
      
      setCurrentInterval(null);
    }
  }, [currentInterval, onLogActivity]);

  useEffect(() => {
    const updateTimer = (timestamp) => {
      if (!lastUpdateRef.current) {
        lastUpdateRef.current = timestamp;
      }

      const deltaTime = timestamp - lastUpdateRef.current;
      if (deltaTime >= 50) { // Actualizar cada 50ms para un balance entre suavidad y rendimiento
        setTime(prevTime => prevTime + Math.floor(deltaTime / 1000));
        lastUpdateRef.current = timestamp;
      }

      if (isRunning) {
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      }
    };

    if (isRunning) {
      if (!currentInterval) {
        startNewInterval();
      }
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else if (currentInterval) {
      endCurrentInterval();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, currentInterval, startNewInterval, endCurrentInterval]);

  const handleStart = () => {
    setIsRunning(true);
    lastUpdateRef.current = performance.now();
  };

  const handlePause = () => {
    setIsRunning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleReset = () => {
    handlePause();
    endCurrentInterval();
    setTime(0);
    lastUpdateRef.current = 0;
  };

  return (
    <div className="timer">
      <div className="time-display">
        {formatTime(time)}
      </div>
      <div className="timer-controls">
        <button 
          onClick={isRunning ? handlePause : handleStart}
          className={isRunning ? 'pause' : 'start'}
        >
          {isRunning ? 'Pausar' : 'Iniciar'}
        </button>
        <button 
          onClick={handleReset}
          className="reset"
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
} 