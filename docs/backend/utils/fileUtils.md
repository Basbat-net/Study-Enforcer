# fileUtils.js

## Role

Generic file helpers: ensure a file exists (create with default content if not), safe JSON read/write/delete with proper-lockfile and backup/temp-write for safety. Used by routes and services for all Database file access.

## Main functions

- **ensureFileExists(filePath, defaultContent)** – fs.access; on ENOENT mkdir parent, writeFile defaultContent; else rethrow. No return; throws on error.
- **safeReadJson(filePath)** – ensureFileExists(filePath, '{}'); shared lock; read file, strip control chars, JSON.parse. On parse error tries recovery (last `{...}` in file). Returns parsed object or null; releases lock in finally.
- **safeWriteJson(filePath, data)** – mkdir dir, ensureFileExists; exclusive lock; copy file to .backup; validate JSON.stringify; write to filePath.tmp, rename to filePath (atomic). On error restores from .backup; throws; releases lock in finally.
- **safeDeleteFile(filePath)** – ensureFileExists (create empty if missing); exclusive lock; copy to .backup; unlink filePath. Releases lock in finally. Used by logsRoutes DELETE and timerRoutes DELETE.

## Structures / dependencies

- **LOCK_OPTIONS** (config) – shared: true for reads; exclusive for write/delete.
- **proper-lockfile** – lock/release.
- **fs/promises** – access, readFile, writeFile, copyFile, rename, unlink, mkdir.
