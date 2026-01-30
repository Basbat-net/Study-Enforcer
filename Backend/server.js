// La aplicacion principal de la que cuelgan el resto de rutas y servicios

// routes usados:
//  - logsRoutes (/api/logs/)
//  - usersRoutes (/api/users/)
//  - timerRoutes (/api/timer-state/)
//  - intervalRoutes (/api/inactive-interval/)

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';

// archivos configuracion
import { PORT, CORS_OPTIONS, DATABASE_DIR, USERS_DATA_DIR, USERS_FILE, INACTIVE_INTERVALS_FILE } from './config/index.js';

// Routes
import logsRoutes from './routes/logsRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import timerRoutes from './routes/timerRoutes.js';
import intervalRoutes from './routes/intervalRoutes.js';

// Initialize Express app
const app = express();

// Middleware
app.use(cors(CORS_OPTIONS));
app.use(express.json());

// < -------------------------------------- INITIALIZATION -------------------------------------- >

// Crea la database y el directorio de los usuarios
await fs.mkdir(DATABASE_DIR, { recursive: true });
await fs.mkdir(USERS_DATA_DIR, { recursive: true });

// Asegura que existan los archivos en Database/
// Usuarios
try {
  await fs.access(USERS_FILE);
} catch (error) {
  await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
}
// Intervalos inactivos
try {
  await fs.access(INACTIVE_INTERVALS_FILE);
} catch (error) {
  await fs.writeFile(INACTIVE_INTERVALS_FILE, JSON.stringify({}, null, 2));
}

// < -------------------------------------- ROUTES -------------------------------------- >

// IMPORTANTE!! AQUI SE MONTAN LAS RUTAS
app.use('/api/logs', logsRoutes);
app.use('/api/users', usersRoutes);
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));
app.use('/api/timer-state', timerRoutes);
app.use('/api/inactive-interval', intervalRoutes);

// < -------------------------------------- SERVER START -------------------------------------- >

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
