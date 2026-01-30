# usersRoutes.js

## Role

Router mounted at `/api/users`. Handles user list (merge persistent list + dirs), init new user (create dir + logs + timer_state), ping, and delete user (remove dir + update users.json).

## Endpoints

- **GET /** – getPersistentUsers + listUserDirectories; merges to Set, adds any dir users to persistent list, returns sorted array.
- **GET /ping** – Returns `{ status: 'ok', timestamp }` (mounted at /api/users, so full path is /api/users/ping; server also has /api/ping).
- **POST /init-user/:username** – addUserToList; mkdir user dir; ensureFileExists logs (''), timer_state (DEFAULT_TIMER_STATE); returns success and file paths.
- **DELETE /user/:username** – fs.rm user dir; getPersistentUsers, filter out username, safeWriteJson USERS_FILE.

## Main dependencies

- **getLogsPath, getTimerStatePath, getUserDir, USERS_FILE** (config).
- **fs** (fs/promises) – mkdir, rm.
- **ensureFileExists, safeWriteJson** (fileUtils).
- **addUserToList, getPersistentUsers, listUserDirectories, DEFAULT_TIMER_STATE** (userService).

## Structures / dependencies

- **DEFAULT_TIMER_STATE** – time 0, lastUpdate, wasPaused true, wasRunning false, isActiveTrackingMode true.
