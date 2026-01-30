# timeUtils

## Role

Time formatting helpers for display. Pure functions; no React or API.

## Main functions

- **formatTimeSeconds(seconds)** – Formats seconds as `MM:SS` (zero-padded). Params: number (seconds). Returns: string.
- **formatTime(ms)** – Formats milliseconds as `MM:SS.mm` (zero-padded). Params: number (ms). Returns: string. Used for timer display and log durations in App.

## Structures / dependencies

- No external dependencies. Used by App (formatTime) and ActivityCharts (own formatTimeValue for chart axis/tooltip).
