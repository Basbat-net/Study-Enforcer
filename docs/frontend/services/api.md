# ApiService

## Role

Bridge between frontend and backend. All methods are static. Handles users, logs (with per-username queue and localStorage backup/recovery), inactive intervals, and timer state. Uses `API_URL = window.location.origin + '/api'`.

## Main methods

- **getUsers** – GET /users; returns user list or [].
- **getLogs(username)** – GET /logs/{username}; merges any failed_logs from localStorage, saveLogs merged, then returns logs; updates lastKnownLogCounts.
- **saveLogs(username, logs)** – POST /logs/{username} with full logs array; on failure saves to backup_logs_{username} and rethrows.
- **addLog(username, log)** – Queued: appends log to current logs (getLogs), saveLogs, updates lastKnownLogCounts; on failure pushes to backup. Queue is per-username (Promise chain).
- **clearLogs(username)** – DELETE /logs/{username}; clears backup_logs and failed_logs for user, lastKnownLogCounts to 0.
- **startInactiveInterval(username, timestamp)** – POST /inactive-interval/start/{username} with { timestamp }.
- **endInactiveInterval(username, currentTime)** – POST /inactive-interval/end/{username} with { currentTime }; returns { inactiveLog } when applicable.
- **getTimerState(username)** – GET /timer-state/{username}; normalises and caches in timer_state_backup_{username}; on error returns backup from localStorage.
- **saveTimerState(username, state)** – POST /timer-state/{username} with normalised state; also writes to timer_state_backup_{username}.
- **clearTimerState(username)** – DELETE /timer-state/{username}; removes backup.

## Structures / dependencies

- **logOperationQueue** (Map) – Per-username promise chain so addLog runs sequentially per user.
- **lastKnownLogCounts** (Map) – Per-username log count for queue logic.
- **localStorage keys:** backup_logs_{username}, failed_logs_{username}, timer_state_backup_{username}.
- **addLog queue:** Each call chains on the previous promise for that user; ensures getLogs → push → saveLogs order.
- **_normalizeTimerState** – Ensures time, lastUpdate, wasPaused, wasRunning, isActiveTrackingMode; used by get/save/clear timer state.

