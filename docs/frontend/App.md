# App

## Role

Root component where all hooks and UI components are mounted. Renders user selection when no user is chosen, otherwise the timer UI, controls, charts, log list, and screen saver.

## Main handlers

- **handleTimerStart** – Start timer; sets running, requests wake lock, starts keep-alive and video fallback; saves state. Depends on timer, wakeLock, isActiveTrackingMode.
- **handleTimerStop** – Stop timer; releases wake lock, stops keep-alive/video; logs current interval (active/inactive), then saves state.
- **handleTimerReset** – If running, logs current interval and stops; resets timer to 0 and saves state.
- **toggleTrackingMode** – If running, logs current active interval; flips isActiveTrackingMode and saves state.
- **handleUserSelect** – On user change: if previous user had running timer, logs current interval; sets currentUser, clears timer refs; if new user, loads timer state (or initialises); if null, shows UserSelector.

**Note:** All handlers no-op while `screenSaver.isJustDismissed` is true (short cooldown after dismissing screen saver).

## Main useEffects

- **On currentUser change** – End inactive interval, load logs (merge any inactive log), set logs and totals, load timer state and sync isActiveTrackingMode. Runs only when currentUser changes.
- **On visibility change** – Listens to `visibilitychange`. When tab hidden and active-tracking: release wake lock, log active segment, start inactive; when visible again: reacquire wake lock, log inactive segment, start active. Depends on timer.isRunning, isActiveTrackingMode, lastActivityStart, lastInactivityStart, currentUser.
- **On beforeunload** – If timer running: prevent unload, log current active (if active mode), save timer state. Cleanup removes listener.
- **On currentUser (fullscreen)** – When user is set and not fullscreen, enter fullscreen after 1s delay.
- **Every 5s while running** – setInterval that calls timer.saveState (wasRunning: true, wasPaused: false). Cleanup clears interval. Depends on timer.isRunning, currentUser, etc.

## Main components used

- **UserSelector** – Shown when !currentUser; receives onUserSelect (handleUserSelect).
- **ActivityCharts** – Receives logs.activityLogs and currentUser; shows bar chart and date range (when logs.showLogs).
- **HelpPopup** – Help button and modal; no props.
- **ScreenSaver** – Receives isActive, position, color, elementSize, formattedTime, currentUser, onDismiss from useScreenSaver.
- **ModeSelector** – Receives isActiveTrackingMode, onToggle (toggleTrackingMode), disabled (screenSaver.isJustDismissed).

## Structures / dependencies

- **Log entry shape:** type ('active' | 'inactive'), duration (ms), timestamp, endTimestamp, username.
- App depends on: useTimer, useWakeLock, useScreenSaver, useFullscreen, useActivityLogs, ApiService, formatTime (timeUtils). Hidden video element uses wakeLock.videoRef for wake-lock fallback.
