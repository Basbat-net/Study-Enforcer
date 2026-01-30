# ActivityCharts

## Role

Manages activity charts and log list: bar chart by day/hour, date range picker, and formatted log entries. Data comes from parent (logs).

## Main components / functions

- **LogEntry** (memo) – Renders a single log row: type (active/inactive), formatted duration, timestamp range. Uses formatTimeValue for duration display.
- **ChartComponent** (memo) – Renders recharts BarChart; data key and labels depend on viewMode (daily/hourly). Uses formatYAxis, formatTooltip.
- **formatTimeValue** – Formats value (minutes) as "Xm Ys" or "0".
- **getStartOfWeek** – Returns start of week (Sunday 00:00) for a date.
- **getEndOfWeek** – Returns end of week (Saturday 23:59:999) for a date.

## Props / dependencies

- **logs** – Array of log entries (from parent).
- **username** – Current user (for filtering/display).
- **recharts** (BarChart, Bar, XAxis, YAxis, etc.), **react-datepicker** – Chart and date range.
- **viewMode** (useState) – 'daily' | 'hourly' drives chart aggregation.

## Structures / dependencies

- **Estilos:** ActivityCharts.css.
- Log entry: type, duration, timestamp, endTimestamp (and username in full logs).
