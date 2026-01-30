# logsRoutes.js

## Role

Router mounted at `/api/logs`. Handles read, overwrite, append, and delete of a user's activity logs. Uses config getLogsPath and logService; DELETE uses fileUtils.safeDeleteFile (intended; route should import it from fileUtils).

## Endpoints

- **GET /:username** – Reads logs from file (readLogsFromFile), returns JSON array.
- **POST /:username** – Overwrites logs (writeLogsToFile); body = full logs array.
- **POST /:username/add** – Appends one log (appendLog); body = single log object.
- **DELETE /:username** – Deletes logs file (safeDeleteFile), returns success.

## Main dependencies

- **getLogsPath** (config) – Path to user's logs.json.
- **readLogsFromFile, appendLog, writeLogsToFile** (logService).
- **safeDeleteFile** (fileUtils) – used in DELETE.

## Structures / dependencies

- Log file format: one JSON object per block, blocks separated by `\n\n` (logService read/write).
