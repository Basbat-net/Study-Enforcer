# useActivityLogs

## Role

Holds activity logs for the current user, active/inactive totals, and showLogs toggle. Fetches and recovers from localStorage backup; addLog uses ApiService (which queues writes). Used by App for display and when logging intervals.

## Inputs

- **currentUser** – Username; when null, logs are cleared.

## Returns

- activityLogs, setActivityLogs; activeTime, setActiveTime; inactiveTime, setInactiveTime; showLogs, toggleLogs; addLog; clearLogs; loadLogs; calculateTotals.

## Main functions (useCallbacks)

- **calculateTotals(logs)** – Reduces logs to { active, inactive } duration sums.
- **recoverBackupLogs(username)** – Reads backup_logs_{username} from localStorage; merges missing entries with server logs, saveLogs, then clears backup.
- **loadLogs(username)** – Calls recoverBackupLogs then ApiService.getLogs; sets activityLogs and totals. No-op if no username.
- **addLog(log)** – ApiService.addLog(currentUser, log); appends to local state and updates activeTime/inactiveTime by log.type.
- **clearLogs** – Confirms then ApiService.clearLogs; clears local state.
- **toggleLogs** – Flips showLogs.

## Main useEffects

- **On currentUser / loadLogs** – When currentUser is set, calls loadLogs(currentUser). Depends on currentUser, loadLogs.

## Structures / dependencies

- **ApiService** – getLogs, saveLogs, addLog (queued), clearLogs.
- **localStorage** – backup_logs_{username} for recovery; ApiService also uses failed_logs and backup.
- **Log shape** – type ('active'|'inactive'), duration, timestamp, endTimestamp, username.
