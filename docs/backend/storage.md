# Storage (Database)

## Role

All persistent data lives under `Backend/Database/` as JSON files. No database server; file-based with locking (proper-lockfile) and backups (.backup, .tmp) where applicable.

## Layout

| Path | Description |
| ---- | ----------- |
| **Database/users.json** | Array of usernames (persistent user list). |
| **Database/inactive_intervals.json** | Object: username → { startTime, isActive }. |
| **Database/users/{username}/logs.json** | Activity logs: JSON objects separated by `\n\n`. |
| **Database/users/{username}/timer_state.json** | Single JSON object: time, lastUpdate, wasPaused, wasRunning, isActiveTrackingMode. |

## Who writes what

- **users.json** – userService (getPersistentUsers, addUserToList); usersRoutes DELETE.
- **inactive_intervals.json** – intervalRoutes (start/end); full file rewritten each time.
- **users/{username}/logs.json** – logService (readLogsFromFile, appendLog, writeLogsToFile); logsRoutes and intervalRoutes (appendLog).
- **users/{username}/timer_state.json** – timerRoutes via fileUtils (safeReadJson, safeWriteJson, safeDeleteFile).

## Structures / dependencies

- **Locking:** logService and fileUtils use proper-lockfile with config LOCK_OPTIONS; shared lock for reads, exclusive for writes.
- **Backups:** fileUtils writes .backup before write/delete; logService writes .backup before writeLogsToFile.
