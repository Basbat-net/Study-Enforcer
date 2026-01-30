// Gestion del salvapantallas para que no se te queme la pantalla juju

// esto hace una cadena un poco rara
// 1 - Se ejecuta el useEffect 1 y se declaran los listeners
// 2 - cuando uno de los triggers resuelve, va a llamar a handleInteraction
// 3 - al ejecutarse recordInteraction, se reincia la flag astInteractionRef.current
// 4 - en useEffect 2, hay un setInterval que chequea cada segundo el tiempo desde la
//     ultima interaccion, y si es mayor al tiempo definido, activa el screenSaver

// funciones importantes:
// 1 - checkScreenSaver: chequea cada segundo si ha pasado el tiempo definido para activar el screenSaver

// useCallBacks:
// 1 - dismiss: quita el screenSaver 
// 2 - recordInteraction: se reincia la flag astInteractionRef.current

// useEffects:
// 1 - useEffect 1: se declaran los listeners
// 2 - useEffect 2: se crea el setInterval que chequea cada segundo el tiempo desde la
//     ultima interaccion, y si es mayor al tiempo definido, activa el screenSaver
// 3 - useEffect 3: se crea la animacion del screenSaver

// nota para el futuro: useCallBack genera una funcion con useStates que se regenera bajo unas condiciones
//                      useEffecct ejecuta el codigo automaticamente cuando cambia el array de dependencias
//                      la cleanup function se ejecuta si se reejecuta el useEffect (se desmonta el componente)
import { useState, useRef, useEffect, useCallback } from 'react';

// Config de los parametros del salvapantalla
const SCREENSAVER_DELAY = 60 * 1000; // tiempo hasta el trigger
const SCREENSAVER_ELEMENT_SIZE = 120; // Tamaño
const SCREENSAVER_SPEED = 2; // velocidad
// cicla estos colores
const COLORS = ['#00ff00', '#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];

export function useScreenSaver() {

  // useStates de cosas
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [velocity, setVelocity] = useState({ x: 2, y: 2 });
  const [color, setColor] = useState('#00ff00');
  const [isJustDismissed, setIsJustDismissed] = useState(false);

  const lastInteractionRef = useRef(Date.now());
  const animationIntervalRef = useRef(null);

  // IMPORTANTE: Esto es un useCallback, asi que se declara una vez, y solo se regenera cuando cambia isActive
  const dismiss = useCallback(() => {
    if (isActive) {
      setIsActive(false);
      setIsJustDismissed(true);
      
      // Si se ha activado solo una vez esperamos 10 segundos y si no se
      // vuelve a ejecutar lo volvemos a poner
      setTimeout(() => {
        setIsJustDismissed(false);
      }, 10000);
    }
  }, [isActive]);

  // igual que en la de arriba, solo se regenera la funcion en caso de que cambie isActive o dismiss 
  const recordInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
    // si esta activo, se llama a dismiss y se cierra el screenSaver
    if (isActive) {
      dismiss();
    }
  }, [isActive, dismiss]);


  // useEffect 2
  // esta es la que crea el setInterval que chequea cada segundo el tiempo desde la
  // ultima interaccion, y si es mayor al tiempo definido, activa el screenSaver
  useEffect(() => {
    const checkScreenSaver = () => {
      const now = Date.now();
      const timeSinceInteraction = now - lastInteractionRef.current;
      
      if (timeSinceInteraction > SCREENSAVER_DELAY && !isActive) {
        // ponemos el isActive en true (regenera los useCallBacks)
        setIsActive(true);
        // posicion y velocidad aleatorias
        setPosition({
          x: Math.random() * (window.innerWidth - SCREENSAVER_ELEMENT_SIZE),
          y: Math.random() * (window.innerHeight - SCREENSAVER_ELEMENT_SIZE)
        });
        setVelocity({
          x: (Math.random() > 0.5 ? 1 : -1) * SCREENSAVER_SPEED,
          y: (Math.random() > 0.5 ? 1 : -1) * SCREENSAVER_SPEED
        });
      }
    };

    // esto es el intervalo que chequea cada segundo el tiempo hasta 
    const interval = setInterval(checkScreenSaver, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  // useEffect 1
  // Chequeamos todas las interacciones para probar el screenSaver
  // IMPORTANTE: Se regenera todo el callback cuando se quita el screenSaver para que apunten a los
  // useCallbacks regenerads y no a los originales
  useEffect(() => {

    // esta es la funcion que se ejecuta cuando se produce una interaccion
    const handleInteraction = () => {
      recordInteraction();
    };
    
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

    // añadimos un eventListener para todos los triggerrs
    events.forEach(event => {
      window.addEventListener(event, handleInteraction, { passive: true });
    });

    // eliminamos los listeners si se desmonta
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, [recordInteraction]);

  // useEffect 3
  // la animacion del screenSaver 
  useEffect(() => {
    if (isActive) {
      const animate = () => {
        setPosition(prev => {
          let newX = prev.x + velocity.x;
          let newY = prev.y + velocity.y;
          let newVelX = velocity.x;
          let newVelY = velocity.y;

          // Bounce off walls
          if (newX <= 0 || newX >= window.innerWidth - SCREENSAVER_ELEMENT_SIZE) {
            newVelX = -newVelX;
            newX = Math.max(0, Math.min(newX, window.innerWidth - SCREENSAVER_ELEMENT_SIZE));
            // Change color on bounce
            setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
          }

          if (newY <= 0 || newY >= window.innerHeight - SCREENSAVER_ELEMENT_SIZE) {
            newVelY = -newVelY;
            newY = Math.max(0, Math.min(newY, window.innerHeight - SCREENSAVER_ELEMENT_SIZE));
            // Change color on bounce
            setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
          }

          setVelocity({ x: newVelX, y: newVelY });

          return { x: newX, y: newY };
        });
      };
      // los fps en los que corre (se puede bajar pero creo que no merece la pena)
      animationIntervalRef.current = setInterval(animate, 16); // ~60fps
      return () => {
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current);
        }
      };
    }
  }, [isActive, velocity]);

  return {
    isActive,
    position,
    color,
    isJustDismissed,
    dismiss,
    recordInteraction,
    ELEMENT_SIZE: SCREENSAVER_ELEMENT_SIZE
  };
}
