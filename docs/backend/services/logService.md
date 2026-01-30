# logService.js

## Role

Read, append, and overwrite user activity logs on disk. Uses proper-lockfile (shared lock for read, exclusive for write/append) and config LOCK_OPTIONS. Log file format: JSON objects separated by `\n\n`.

## Main functions

- **readLogsFromFile(filePath)** – ensureFileExists; acquire shared lock; read file, split by `\n\n`, parse each block as JSON (with fallback line-by-line parse for malformed blocks); return array. On error returns []. Always releases lock in finally.
- **appendLog(filePath, log)** – mkdir dir, ensureFileExists; exclusive lock; append JSON.stringify(log, null, 2) + '\n'. Throws on error; releases lock in finally.
- **writeLogsToFile(filePath, logs)** – mkdir, ensureFileExists; exclusive lock; copy file to .backup; write file as logs.map(JSON.stringify).join('\n\n') + '\n\n'. Overwrites entire file; throws on error; releases lock in finally.

## Structures / dependencies

- **LOCK_OPTIONS** (config) – shared: true for read; exclusive for append/write.
- **ensureFileExists** (fileUtils).
- **proper-lockfile** – lock/release; shared for read to allow concurrent reads.
- Log entry shape: type, duration, timestamp, endTimestamp, username (and any other fields frontend sends).
