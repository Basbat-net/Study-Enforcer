// Gestion de los graficos de actividad
//
// Estilos usados:
// - ActivityCharts.css (importado globalmente en App.jsx)

import { memo, useCallback, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// formateo basicorro de que las cosas salgan bien
const formatTimeValue = (value) => {
  if (!value || value === 0) return '0';
  const minutes = Math.floor(value);
  const seconds = Math.floor((value - minutes) * 60);
  if (minutes === 0) {
    return `${seconds}s`;
  } else if (seconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
};

// Obtiene el inicio de la semana
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Obtiene el fin de la semana
const getEndOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  d.setHours(23, 59, 59, 999);
  return d;
};

// Componente memoizado para el gráfico
const ChartComponent = memo(({ chartData, viewMode, formatYAxis, formatTooltip }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          angle={viewMode === 'hourly' ? -45 : 0}
          textAnchor={viewMode === 'hourly' ? 'end' : 'middle'}
          height={60}
        />
        <YAxis tickFormatter={formatYAxis} />
        <Tooltip
          formatter={formatTooltip}
          contentStyle={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--bg-tertiary)',
            color: 'var(--text-primary)',
          }}
          separator=""
        />
        <Bar
          dataKey="estudio"
          name="Tiempo de estudio"
          fill="var(--accent-green)"
          minPointSize={1}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});

// Componente general por encima del grafico
export const ActivityCharts = memo(function ActivityCharts({ logs, username }) {
  const [viewMode, setViewMode] = useState('hourly'); // El usestate para el tipo de grafico
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Genera los datos del grafico
  const chartData = useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0 || !username) {
      if (viewMode === 'weekly') {
        return DAYS.map((day) => ({ name: day, estudio: 0 }));
      }
      return Array(24)
        .fill(0)
        .map((_, i) => ({
          name: `${String(i).padStart(2, '0')}:00`,
          estudio: 0,
        }));
    }

    // Filtrar logs por usuario
    const userLogs = logs.filter((log) => log.username === username);

    // Caso semanal
    if (viewMode === 'weekly') {
      const startOfWeek = getStartOfWeek(selectedDate);
      const endOfWeek = getEndOfWeek(selectedDate);

      // Hace un map de los dias
      const weeklyData = DAYS.map((day) => ({
        name: day,
        estudio: 0,
      }));

      // va sumando los user logs que caen en el rango del dia
      userLogs.forEach((log) => {
        const logDate = new Date(log.timestamp);
        if (logDate >= startOfWeek && logDate <= endOfWeek && log.type === 'active') {
          weeklyData[logDate.getDay()].estudio += log.duration / (1000 * 60);
        }
      });

      return weeklyData;
    }

    // Caso por horas
    const hourlyIntervals = Array(24)
      .fill(0)
      .map((_, index) => ({
        name: `${String(index).padStart(2, '0')}:00`,
        estudio: 0,
      }));

    // Va sumando los user logs que caen en el rango de la hora
    userLogs.forEach((log) => {
      const startDate = new Date(log.timestamp);
      const endDate = new Date(log.endTimestamp || log.timestamp);
      const startHour = startDate.getHours();
      const endHour = endDate.getHours();
      const duration = log.duration / (1000 * 60);

      if (startHour === endHour) {
        if (log.type === 'active') {
          hourlyIntervals[startHour].estudio += duration;
        }
      } else {
        // Distribuir el tiempo proporcionalmente por cada hora
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();

        let currentTime = startTime;
        while (currentTime < endTime) {
          const currentHour = new Date(currentTime).getHours();
          const nextHourStart = new Date(currentTime);
          nextHourStart.setHours(currentHour + 1, 0, 0, 0);

          const timeInThisHour = Math.min(nextHourStart.getTime(), endTime) - currentTime;
          if (log.type === 'active') {
            hourlyIntervals[currentHour].estudio += timeInThisHour / (1000 * 60);
          }

          currentTime = nextHourStart.getTime();
        }
      }
    });

    return hourlyIntervals;
  }, [logs, viewMode, selectedDate, username]);

  //Movidas varias de formato
  const formatYAxis = useCallback((value) => {
    return formatTimeValue(value);
  }, []);

  const formatTooltip = useCallback((value) => {
    if (!value || value === 0) return ['', ''];

    const minutes = Math.floor(value);
    const seconds = Math.floor((value - minutes) * 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    const timeStr =
      [
        hours > 0 ? `${hours}h` : '',
        remainingMinutes > 0 ? `${remainingMinutes}m` : '',
        seconds > 0 ? `${seconds}s` : '',
      ]
        .filter(Boolean)
        .join(' ') || '0s';

    return [`Tiempo de estudio: ${timeStr}`, ''];
  }, []);

  return (
    <div className="activity-charts">
      <div className="chart-controls">
        <div className="view-mode-controls">
          <button
            className={viewMode === 'hourly' ? 'active' : ''}
            onClick={() => setViewMode('hourly')}
          >
            Por Horas
          </button>
          <button
            className={viewMode === 'weekly' ? 'active' : ''}
            onClick={() => setViewMode('weekly')}
          >
            Semanal
          </button>
        </div>
        {viewMode === 'weekly' && (
          <div className="week-selector">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Seleccionar semana"
              className="week-picker"
            />
          </div>
        )}
      </div>

      <div className="chart-container">
        <ChartComponent
          chartData={chartData}
          viewMode={viewMode}
          formatYAxis={formatYAxis}
          formatTooltip={formatTooltip}
        />
      </div>
    </div>
  );
});

