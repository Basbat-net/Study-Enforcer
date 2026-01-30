# timerRoutes.js

## Role

Router mounted at `/api/timer-state`. Handles get, save, and delete of a user's timer state JSON. All reads/writes go through fileUtils (ensureFileExists, safeReadJson, safeWriteJson, safeDeleteFile); state is validated/normalised with userService.validateTimerState.

## Endpoints

- **GET /:username** – ensureFileExists, safeReadJson; if valid object, return validateTimerState(state); else null. On error return DEFAULT_TIMER_STATE.
- **POST /:username** – validateTimerState(req.body), safeWriteJson; return success and state. On error 500 with message.
- **DELETE /:username** – safeDeleteFile(timer state path); return success.

## Main dependencies

- **getTimerStatePath** (config).
- **ensureFileExists, safeReadJson, safeWriteJson, safeDeleteFile** (fileUtils).
- **validateTimerState, DEFAULT_TIMER_STATE** (userService).

## Structures / dependencies

- Timer state shape: time, lastUpdate, wasPaused, wasRunning, isActiveTrackingMode (validated by validateTimerState).
