# useTimer

## Role

Holds timer state (elapsed time, running, last activity/inactivity start) and syncs with the backend. Advances time via requestAnimationFrame when running and (in active-tracking mode) when page is visible.

## Inputs

- **currentUser** – Username for load/save (or null).
- **isActiveTrackingMode** – If true, timer only ticks when page is visible.
- **isPageVisible** – Whether the tab is visible (from document.hidden).

## Returns

- time, setTime; isRunning, setIsRunning; lastActivityStart, setLastActivityStart; lastInactivityStart, setLastInactivityStart; loadTimerState; saveState; reset.

## Main functions

- **loadTimerState(username)** – Fetches timer state from API (ApiService.getTimerState). If valid, sets time and returns state; else sets time to 0 and returns null. If no username, clears state.
- **saveState(overrides = {}, usernameOverride)** – Persists current time, lastUpdate, wasPaused, wasRunning, isActiveTrackingMode to API; overrides object merges over defaults. No-op if no user.
- **reset** – Sets time and lastActivityStart/lastInactivityStart to 0/null.

## Main useEffects

- **requestAnimationFrame loop** – When isRunning and (in active mode) isPageVisible: advances time by delta each frame; sets lastActivityStart (and lastInactivityStart if inactive mode) on first tick. Cleanup: cancelAnimationFrame. Depends on isRunning, isActiveTrackingMode, lastActivityStart, isPageVisible.

## Structures / dependencies

- **ApiService.getTimerState**, **ApiService.saveTimerState** – Backend persistence.
- **saveState overrides** – Any passed keys override the default payload (time, lastUpdate, wasPaused, wasRunning, isActiveTrackingMode).
