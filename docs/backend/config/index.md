# config/index.js

## Role

Central config: port, CORS, database paths, path helpers for user logs/timer/dir, and lock options for file operations (proper-lockfile).

## Exports

- **PORT** – 3000.
- **CORS_OPTIONS** – origin (localhost 5173/3000), methods (GET, POST, DELETE, OPTIONS), allowedHeaders (Content-Type), credentials.
- **ROOT_DIR** – Backend root (from `import.meta.url`).
- **DATABASE_DIR** – Backend/Database.
- **USERS_DATA_DIR** – Database/users.
- **USERS_FILE** – Database/users.json.
- **INACTIVE_INTERVALS_FILE** – Database/inactive_intervals.json.
- **getLogsPath(username)** – Database/users/{username}/logs.json.
- **getTimerStatePath(username)** – Database/users/{username}/timer_state.json.
- **getUserDir(username)** – Database/users/{username}.
- **LOCK_OPTIONS** – stale, update, retries (exponential backoff) for proper-lockfile.

## Structures / dependencies

- **path**, **url (fileURLToPath)** – for ROOT_DIR and path joins. Used by routes and services to resolve file paths.
