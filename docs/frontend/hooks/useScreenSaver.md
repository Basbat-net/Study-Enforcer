# useScreenSaver

## Role

Idle screen saver: after a delay with no interaction, shows overlay; records interactions to reset the timer or dismiss; runs bouncing animation when active. Exposes isJustDismissed for a short cooldown so App handlers don’t fire immediately after dismiss.

## Returns

- isActive; position; color; isJustDismissed; dismiss; recordInteraction; ELEMENT_SIZE.

## Main functions (useCallbacks)

- **dismiss** – If active: set isActive false, isJustDismissed true; after 10s set isJustDismissed false. Depends on isActive.
- **recordInteraction** – Updates lastInteractionRef; if active, calls dismiss. Depends on isActive, dismiss.

## Main useEffects

- **Interaction listeners** – Adds listeners for mousedown, mousemove, keydown, touchstart, etc.; handler calls recordInteraction. Cleanup removes all. Depends on recordInteraction.
- **Check interval** – setInterval every 1s: if time since last interaction &gt; SCREENSAVER_DELAY (60s) and !isActive, set isActive true and random position/velocity. Cleanup clears interval. Depends on isActive.
- **Animation** – When isActive: setInterval ~16ms updates position (bounce off walls, random color on bounce). Cleanup clears interval. Depends on isActive, velocity.

## Structures / dependencies

- **SCREENSAVER_DELAY** – 60s; **SCREENSAVER_ELEMENT_SIZE** – 120; **SCREENSAVER_SPEED** – 2; **COLORS** – palette for bounce.
- **lastInteractionRef** – Timestamp of last interaction; **animationIntervalRef** – interval id for cleanup.
- **isJustDismissed** – True for 10s after dismiss; App uses it to block handlers.
