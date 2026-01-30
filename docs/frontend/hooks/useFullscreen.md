# useFullscreen

## Role

Tracks fullscreen state and exposes enter/exit/toggle. Uses standard and webkit/ms prefixes. Listens to fullscreen change events to keep isFullscreen in sync.

## Returns

- isFullscreen; enterFullscreen; exitFullscreen; toggleFullscreen.

## Main functions

- **enterFullscreen** – Calls document.documentElement.requestFullscreen (or webkit/ms) if available.
- **exitFullscreen** – Calls document.exitFullscreen (or webkit/ms) if available.
- **toggleFullscreen** – If fullscreen then exit, else enter. Used by App button.

## Main useEffects

- **On mount** – Adds fullscreenchange, webkitfullscreenchange, msfullscreenchange listeners; handler sets isFullscreen from document.fullscreenElement (or webkit/ms). Cleanup removes listeners. Empty deps; runs once.

## Structures / dependencies

- **Browser APIs** – document.documentElement.requestFullscreen, document.exitFullscreen, document.fullscreenElement (and webkit/ms variants).
