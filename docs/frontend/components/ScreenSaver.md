# ScreenSaver

## Role

Presents the screen saver overlay: a bouncing coloured square showing timer and user, plus "Toca para salir". All state and animation logic live in useScreenSaver; this component is presentational.

## Props / dependencies

- **isActive** – Whether overlay is visible.
- **position** – { x, y } for the bouncing element.
- **color** – Background colour of the square.
- **elementSize** – Width/height of the square (from useScreenSaver.ELEMENT_SIZE).
- **formattedTime** – Timer display string.
- **currentUser** – Username to show.
- **onDismiss** – Called when user taps overlay (useScreenSaver.dismiss).

## Structures / dependencies

- **Estilos:** ScreenSaver.css.
- Logic (idle detection, animation, dismiss cooldown) is in [useScreenSaver](../hooks/useScreenSaver.md).
