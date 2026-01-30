# Hooks & Services Documentation

## Overview

This section explains the custom hooks and services used in the application.

---

## Hooks

Hooks encapsulate reusable stateful logic. They use React's built-in hooks internally.

### useTimer
<!-- TODO: Explain timer hook -->

### useWakeLock
<!-- TODO: Explain wake lock hook -->

### useScreenSaver
<!-- TODO: Explain screen saver hook -->

### useFullscreen
<!-- TODO: Explain fullscreen hook -->

### useActivityLogs
<!-- TODO: Explain activity logs hook -->

---

## Services

Services handle external communication (API calls, storage). They are plain JavaScript with no React dependencies.

### ApiService
Single service for backend communication and storage orchestration: users, logs, inactive intervals, timer state. Handles queued log writes, localStorage backup/recovery, and last-known counts. (StorageService was merged into ApiService.)
