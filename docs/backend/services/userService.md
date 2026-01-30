# userService.js

## Role

User list persistence (users.json) and timer state validation. Provides DEFAULT_TIMER_STATE, validateTimerState, listUserDirectories (from filesystem), getPersistentUsers (from users.json), addUserToList (append to users.json if not present).

## Main functions

- **validateTimerState(state)** – Returns normalised object: time (number or 0), lastUpdate (number or Date.now()), wasPaused (bool), wasRunning (bool), isActiveTrackingMode (bool, default true). Used by timerRoutes and frontend ApiService.
- **listUserDirectories()** – fs.readdir USERS_DATA_DIR; return dir names (isDirectory()). On ENOENT returns [].
- **addUserToList(username)** – ensureFileExists USERS_FILE; safeReadJson; if username not in array, push, sort, safeWriteJson.
- **getPersistentUsers()** – ensureFileExists USERS_FILE; safeReadJson; return array or [].

## Structures / dependencies

- **USERS_FILE, USERS_DATA_DIR** (config).
- **ensureFileExists, safeReadJson, safeWriteJson** (fileUtils).
- **DEFAULT_TIMER_STATE** – time 0, lastUpdate, wasPaused true, wasRunning false, isActiveTrackingMode true; exported for routes and init-user.
