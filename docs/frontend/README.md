# Frontend

> **Tip:** If the structure looks flat or dense in the editor, open the **Markdown preview** (e.g. `Ctrl+Shift+V` / `Cmd+Shift+V` or right‑click → “Open Preview”) to see headings, lists, and links rendered.

## Overview

The frontend is a React app for a study timer: it shows a stopwatch, tracks active/inactive time (with optional “only count when tab is visible” mode), displays activity charts and logs, and keeps the screen on while the timer runs. All UI and logic are composed in `App.jsx`, which mounts the hooks and components.

## File structure

- **`main.jsx`** – Entry point; mounts `App` into the DOM.
- **`App.jsx`** – Root component. Composes all hooks (timer, wake lock, screen saver, fullscreen, activity logs) and renders UserSelector when no user is chosen, otherwise the timer UI, controls, charts, log list, and screen saver.
- **`components/`** – UI only:
  - **UserSelector** – First screen: load/create user, call `onUserSelect` when one is chosen.
  - **ActivityCharts** – Bar chart and date range for activity; uses `logs` from parent.
  - **ModeSelector** – Toggle between “active tracking” and “normal timer” mode.
  - **ScreenSaver** – Bouncing overlay when idle; state and logic from `useScreenSaver`.
  - **HelpPopup** – “How it works” modal (static content).
- **`hooks/`** – Stateful logic: `useTimer`, `useWakeLock`, `useScreenSaver`, `useFullscreen`, `useActivityLogs`.
- **`services/`** – **ApiService**: bridge to backend (users, logs, inactive intervals, timer state); queue for log writes, localStorage backup/recovery.
- **`utils/`** – **timeUtils**: time formatting (e.g. `formatTime` for display).

## Table of contents

- [App](./App.md)
- **Components**
  - [UserSelector](./components/UserSelector.md)
  - [ActivityCharts](./components/ActivityCharts.md)
  - [ModeSelector](./components/ModeSelector.md)
  - [ScreenSaver](./components/ScreenSaver.md)
  - [HelpPopup](./components/HelpPopup.md)
- **Hooks**
  - [useTimer](./hooks/useTimer.md)
  - [useWakeLock](./hooks/useWakeLock.md)
  - [useScreenSaver](./hooks/useScreenSaver.md)
  - [useFullscreen](./hooks/useFullscreen.md)
  - [useActivityLogs](./hooks/useActivityLogs.md)
- **Services**
  - [api](./services/api.md)
- **Utils**
  - [timeUtils](./utils/timeUtils.md)
- [Styles](./styles.md)
