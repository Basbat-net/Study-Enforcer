# ModeSelector

## Role

Checkbox to toggle between "Modo de Seguimiento Activo" (only count when tab visible) and "Modo Cronómetro Normal" (count always). Disabled when screen saver was just dismissed.

## Props / dependencies

- **isActiveTrackingMode** – Current mode (checked = active tracking).
- **onToggle** – Called when checkbox changes.
- **disabled** – When true, checkbox is disabled (e.g. screenSaver.isJustDismissed).

## Structures / dependencies

- **Estilos:** ModeSelector.css.
