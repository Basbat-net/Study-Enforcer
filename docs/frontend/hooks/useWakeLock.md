# useWakeLock

## Role

Keeps the screen on while the timer is running: requests/releases Screen Wake Lock API and runs a keep-alive ping plus optional hidden-video fallback. Used when timer starts; released when timer stops or tab hidden.

## Inputs

- **isRunning** – Whether the timer is running (drives when to reacquire).

## Returns

- videoRef; requestWakeLock; releaseWakeLock; reacquireWakeLock; startKeepAlive; stopKeepAlive; startVideoPlayback; stopVideoPlayback.

## Main functions (useCallbacks)

- **requestWakeLock** – Requests navigator.wakeLock.request('screen'); on release sets ref to null.
- **releaseWakeLock** – Releases current wake lock if held.
- **reacquireWakeLock** – If isRunning and !document.hidden and (no lock or released), calls requestWakeLock.
- **startKeepAlive** – setInterval every 30s: GET /api/ping. Prevents duplicate interval.
- **stopKeepAlive** – Clears the ping interval.
- **startVideoPlayback** – Plays videoRef at 0.1 rate, muted (fallback when Wake Lock unreliable).
- **stopVideoPlayback** – Pauses videoRef.

## Main useEffects

- **On mount** – Adds window 'focus' listener to reacquireWakeLock. Cleanup: remove listener, releaseWakeLock, stopKeepAlive. Depends on reacquireWakeLock, releaseWakeLock, stopKeepAlive.

## Structures / dependencies

- **videoRef** – Passed to hidden &lt;video&gt; in App for fallback playback.
- **API** – GET /api/ping for keep-alive.
