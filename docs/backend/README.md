# Backend

> **Tip:** If the structure looks flat or dense in the editor, open the **Markdown preview** (e.g. `Ctrl+Shift+V` / `Cmd+Shift+V` or right‑click → "Open Preview") to see headings, lists, and links rendered.

## Overview

The backend is an Express server that stores user data and timer state in JSON files under `Backend/Database/`. It exposes REST APIs for users, activity logs, timer state, and inactive intervals. All routes are mounted under `/api/`; CORS and port are configured in `config/index.js`.

## File structure

- **`server.js`** – Entry point. Creates Express app, ensures Database dirs and files exist, mounts routes at `/api/logs`, `/api/users`, `/api/ping`, `/api/timer-state`, `/api/inactive-interval`, then listens on PORT.
- **`config/index.js`** – PORT, CORS, paths (DATABASE_DIR, USERS_FILE, USERS_DATA_DIR, INACTIVE_INTERVALS_FILE), path helpers (getLogsPath, getTimerStatePath, getUserDir), LOCK_OPTIONS for file locking.
- **`routes/`** – Express routers:
  - **logsRoutes** – GET/POST/DELETE logs, POST add single log; uses logService and getLogsPath.
  - **usersRoutes** – GET user list, POST init user, DELETE user; uses userService, fileUtils, config paths.
  - **timerRoutes** – GET/POST/DELETE timer state; uses fileUtils, userService.validateTimerState.
  - **intervalRoutes** – POST start/end inactive interval; uses INACTIVE_INTERVALS_FILE, logService.appendLog.
- **`services/`** – **logService**: read/append/write logs with locking; **userService**: user list, validateTimerState, DEFAULT_TIMER_STATE.
- **`utils/`** – **fileUtils**: ensureFileExists, safeReadJson, safeWriteJson, safeDeleteFile (all with locking/backup where applicable).
- **`Database/`** – JSON file storage: users.json, inactive_intervals.json, users/{username}/logs.json, users/{username}/timer_state.json.

## Table of contents

- [server](./server.md)
- [config](./config/index.md)
- **Routes**
  - [logsRoutes](./routes/logsRoutes.md)
  - [usersRoutes](./routes/usersRoutes.md)
  - [timerRoutes](./routes/timerRoutes.md)
  - [intervalRoutes](./routes/intervalRoutes.md)
- **Services**
  - [logService](./services/logService.md)
  - [userService](./services/userService.md)
- **Utils**
  - [fileUtils](./utils/fileUtils.md)
- [Storage](./storage.md)
