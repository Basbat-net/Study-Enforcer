# intervalRoutes.js

## Role

Router mounted at `/api/inactive-interval`. Tracks inactive intervals per user in INACTIVE_INTERVALS_FILE; start writes username → { startTime, isActive: true }; end reads interval, appends inactive log via logService.appendLog, deletes user from intervals file, returns inactiveLog for frontend.

## Endpoints

- **POST /start/:username** – Body: { timestamp }. Read INACTIVE_INTERVALS_FILE, set intervals[username] = { startTime: timestamp, isActive: true }, safeWriteJson. Return success.
- **POST /end/:username** – Body: { currentTime }. Read intervals; if pendingInterval for user and isActive, compute duration, build inactiveLog (type, duration, timestamp, endTimestamp, username), appendLog(getLogsPath(username), inactiveLog); delete intervals[username], safeWriteJson. Return success, inactiveLog, hadPendingInterval.

## Main dependencies

- **getLogsPath, INACTIVE_INTERVALS_FILE** (config).
- **safeReadJson, safeWriteJson** (fileUtils).
- **appendLog** (logService) – called directly (backend), not via HTTP.

## Structures / dependencies

- **inactive_intervals.json** – Object keyed by username; value { startTime, isActive }. Full file rewritten on each start/end (no append).
- **inactiveLog** – type 'inactive', duration, timestamp, endTimestamp, username.
