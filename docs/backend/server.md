# server.js

## Role

Main Express app: mounts CORS and JSON middleware, ensures Database dirs and files exist at startup, mounts all API routes under `/api/`, then listens on PORT.

## Initialization

- Creates `Database/` and `Database/users/` if missing.
- Ensures `users.json` exists (writes `[]` if not).
- Ensures `inactive_intervals.json` exists (writes `{}` if not).

## Routes mounted

- **/api/logs** – logsRoutes (GET/POST/DELETE logs, POST add).
- **/api/users** – usersRoutes (GET list, POST init-user, DELETE user).
- **/api/ping** – In-app handler: `res.json({ status: 'ok', timestamp: Date.now() })`.
- **/api/timer-state** – timerRoutes (GET/POST/DELETE timer state).
- **/api/inactive-interval** – intervalRoutes (POST start/end).

## Structures / dependencies

- **config:** PORT, CORS_OPTIONS, DATABASE_DIR, USERS_DATA_DIR, USERS_FILE, INACTIVE_INTERVALS_FILE.
- **express**, **cors**, **fs/promises** – app, middleware, mkdir/access/writeFile for init.
