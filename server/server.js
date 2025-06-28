// <--  LIBRERIAS -- >
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import readline from 'readline';
import lockfile from 'proper-lockfile';



const pipelineAsync = promisify(pipeline);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// <--  CONFIGURACION -- >
const app = express();
const PORT = 3000;


// permite a los accesos desde estudio.basbat.es hacer cosas con el servidor,
// si se cambia el dominio hay que cambiar esto 
app.use(cors({
  origin: ['http://estudio.basbat.es', 'https://estudio.basbat.es'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));
app.use(express.json());


// <-- Inicializacion de archivos -- >

// carpeta server/logs
const LOGS_DIR = path.join(__dirname, 'logs');
await fs.mkdir(LOGS_DIR, { recursive: true });

// archivo server/users.json
const USERS_FILE = path.join(__dirname, 'users.json');
try {
  await fs.access(USERS_FILE);
} catch (error) {
  await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
}

// archivo server/inactive_intervals.json
const INACTIVE_INTERVALS_FILE = path.join(__dirname, 'inactive_intervals.json');
try {
  await fs.access(INACTIVE_INTERVALS_FILE);
} catch (error) {
  await fs.writeFile(INACTIVE_INTERVALS_FILE, JSON.stringify({}, null, 2));
}


// carpeta timer_states
const TIMER_STATE_DIR = path.join(__dirname, 'timer_states');
if (!existsSync(TIMER_STATE_DIR)) {
  mkdirSync(TIMER_STATE_DIR);
}



// < --------------------------------------FUNCIONES -------------------------------------- >


// < --- COSAS DE USERS.JSON --- >

//  migrateExistingUsers()
//  se ejecuta cuando se inicia el servidor y se encarga de migrar los usuarios existentes
//  a la lista persistente de usuarios en el caso de que no estén en users.json
async function migrateExistingUsers() {
  try {
    console.log('[Server] Migrating existing users to persistent list...');
    const existingUsers = new Set();
    

    // Escanea los archivos de logs y guarda usuarios por el titulo del archivo
    try {
      const logFiles = await fs.readdir(LOGS_DIR);
      for (const file of logFiles) {
        // para que  no pille  los backups
        if (file.endsWith('.json')) {
          const username = file.replace('.json', '');
          existingUsers.add(username);
        }
      }
    } catch (error) {
      // si no hay archivos de logs, no hace nada
      console.log('[Server] No existing log files found');
    }
    
    // Hace lo mismo con los archivos de estado del timer
    try {
      const stateFiles = await fs.readdir(TIMER_STATE_DIR);
      for (const file of stateFiles) {
        if (file.endsWith('.json')) {
          // para que  no pille  los backups
          const username = file.replace('.json', '');
          existingUsers.add(username);
        }
      }
    } catch (error) {
      // si no hay archivos de estado del timer, no hace nada
      console.log('[Server] No existing timer state files found');
    }
    

    for (const username of existingUsers) {
      // Añade cada usuario a users.json (es ["user","user2"])
      await addUserToList(username);
    }
    
    console.log(`[Server] Migration complete. Found ${existingUsers.size} existing users.`);
  } catch (error) {
    console.error('[Server] Error during user migration:', error);
  }
}

// addUserToList()
// Basicamente es un append al archivo users.json con los checks de:
// - que el archivo exista
// - que el usuario no esté en la lista
async function addUserToList(username) {
  try {
    await ensureFileExists(USERS_FILE, '[]'); // el por defecto es un array vacio
    const users = await safeReadJson(USERS_FILE) || [];
    if (!users.includes(username)) {
      users.push(username);
      users.sort(); // Keep the list sorted
      await safeWriteJson(USERS_FILE, users);
      console.log(`[Server] Added user ${username} to persistent user list`);
    }
  } catch (error) {
    console.error(`Error adding user ${username} to list:`, error);
  }
}

// getPersistentUsers()
// devuelve la lista de usuarios persistentes en el users.json como un array
async function getPersistentUsers() {
  try {
    await ensureFileExists(USERS_FILE, '[]');
    const users = await safeReadJson(USERS_FILE) || [];
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error('Error reading persistent user list:', error);
    return [];
  }
}

// < --- MODIFICACIONES DE ARCHIVOS --- >

// ensureFileExists()
// Es para ver si existe el archivo, y si no, 
// crearlo con el contenido por defecto (depende del  archivo)
async function ensureFileExists(filePath, defaultContent = '') {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const dir = path.dirname(filePath);
      console.log(`[Server] Creating directory: ${dir}`);
      await fs.mkdir(dir, { recursive: true });
      console.log(`[Server] Creating file: ${filePath}`);
      await fs.writeFile(filePath, defaultContent, 'utf8');
      console.log(`[Server] File created successfully: ${filePath}`);
    } else {
      // por si hay algun otro error raro
      console.error(`[Server] Error accessing file ${filePath}:`, error);
      throw error;
    }
  }
}

// Lock options
const LOCK_OPTIONS = {
  stale: 30000, // Despues de 30s el archivo de lock se considera obsoleto (no debería durar tnato)
  update: 2000, // Para operaciones largas se  va a actualizar el archivo de lock cada 2s porsiaca
  retries: {
    retries: 10,
    factor: 2, // Lo hace exponencial, 100m, 200ms
    minTimeout: 100,
    maxTimeout: 2500,
    randomize: true,
  }
};


// safeReadJson()
// Es una modificacion de la lectura de  archivos con mutex casero usando proper-lockfile
// Se explica como funciona debajo
async function safeReadJson(filePath) {
  // basicamente esta variable se convierte luego en una  funcion
  // porque  lockfile.lock() devuelve un puntero de funcion
  // y si hay y algo  q no  sea null es  la responsable de liberar  el lock
  let release = null;
  try {
    // asegura que el archivo exista antes de  bloquear nada
    await ensureFileExists(filePath, '{}');
    
    // Se crea un archivo de lock que permite leer pero no escribir
    // la funcion lockfile.lock() devuelve un puntero de funcion que es la que libera el lock
    release = await lockfile.lock(filePath, { 
      ...LOCK_OPTIONS,
      shared: true
    });

    const content = await fs.readFile(filePath, 'utf8');
    const cleanContent = content.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim(); //limpia el archivo yoqse
    return JSON.parse(cleanContent); // lo que devuelve el read
    // IMPORTANTE: el bloque finally se ejecuta aunque  haya un return
  }
  catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    // Try to recover corrupted JSON
    try {
      const content = await fs.readFile(filePath, 'utf8');
      // Find the last valid JSON object
      const matches = content.match(/\{[^}]*\}/g);
      if (matches && matches.length > 0) {
        const lastValidJson = matches[matches.length - 1];
        return JSON.parse(lastValidJson);
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
    }
    return null;
  }

  finally {
    // Basicamente en el caso de que se haya bloqueado el archivo bien esto no va
    // a valer  null, entonces si no es null se usa release  (la ahora  funcion)
    // para liberar el lock
    if (release) {
      try {
        await release();
      }
      catch (releaseError) {
        console.error('Error releasing read lock:', releaseError);
      }
    }
  }
}

// Helper function to safely write JSON file with locking
async function safeWriteJson(filePath, data) {
  // basicamente esta variable se convierte luego en una  funcion
  // porque  lockfile.lock() devuelve un puntero de funcion
  // y si hay y algo  q no  sea null es  la responsable de liberar  el lock
  let release = null;
  try {
    // Chequea que la carpeta exista
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Chequea que  el archivo exista dentro de la carpeta
    await ensureFileExists(filePath, '{}');
    
    // A diferencia de safeReadJson, este lock  NO es exclusivo asi
    // que  nada puede tocar el intervalo
    release = await lockfile.lock(filePath, LOCK_OPTIONS);

    // Hace un backup del archivo en  caso de que la lie al editar
    try {
      const backupPath = `${filePath}.backup`;
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error creating backup:', error);
      }
    }

    // Formatea las cosas para que se vean bien
    const jsonString = JSON.stringify(data, null, 2);
    JSON.parse(jsonString); // Validate JSON

    // En vez de reescribir el archivo, se escribe en un archivo temporal 
    // Que luego se cambia el nombre y sustituye al archivo original
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, jsonString + '\n');
    await fs.rename(tempPath, filePath);
  }
  catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    // Try to restore from backup
    try {
      const backupPath = `${filePath}.backup`;
      await fs.copyFile(backupPath, filePath);
    } catch (restoreError) {
      console.error('Error restoring from backup:', restoreError);
    }
    throw error;
  }
  finally {
    // Basicamente en el caso de que se haya bloqueado el archivo bien esto no va
    // a valer  null, entonces si no es null se usa release  (la ahora  funcion)
    // para liberar el lock
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('Error releasing write lock:', releaseError);
      }
    }
  }
}

// < --- LOGS --- >


// HreadLogsFromFile()
// Lee el archivo de logs y lo devuelve como un array de objetos
async function readLogsFromFile(filePath) {
  let release = null;
  try {
    // Chequea que  el archivo exista dentro de la carpeta
    await ensureFileExists(filePath, '');
    
    release = await lockfile.lock(filePath, { 
      ...LOCK_OPTIONS,
      shared: true
    });

    const logs = [];
    
    // Chequea que el archivo no esté vacio
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      return logs; // Return empty array for empty files
    }
    
    // Formatea el archivo con cada subelemento separado por doble salto de linea
    const fileContent = await fs.readFile(filePath, 'utf8');
    const jsonBlocks = fileContent.split('\n\n').filter(block => block.trim());
    
    for (const block of jsonBlocks) {
      if (block.trim()) {
        try {
          // parsea cada subelemento y lo mete en el array logs
          const logEntry = JSON.parse(block.trim());
          logs.push(logEntry);
        }
        catch (error) {

          console.error('Error parsing log entry:', error);
          console.error('Problematic JSON string:', block);
          
          // Fallback: try to parse line by line for older format compatibility
          const lines = block.split('\n');
          let currentJsonString = '';
          let braceCount = 0;
          
          for (const line of lines) {
            if (line.trim()) {
              currentJsonString += line + '\n';
              
              // Count braces to determine when we have a complete JSON object
              for (const char of line) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
              }
              
              // When braceCount reaches 0, we have a complete JSON object
              if (braceCount === 0 && currentJsonString.trim()) {
                try {
                  const logEntry = JSON.parse(currentJsonString.trim());
                  logs.push(logEntry);
                } catch (fallbackError) {
                  console.error('Fallback parsing also failed:', fallbackError);
                }
                currentJsonString = '';
              }
            }
          }
        }
      }
    }

    return logs;
  }

  catch (error) {
    console.error(`Error reading logs from ${filePath}:`, error);
    return []; // Return empty array on error
  }
  finally {
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('Error releasing read lock:', releaseError);
      }
    }
  }
}

// appendLog()
// Añade un log al archivo de logs sin reescribirlo entero
async function appendLog(filePath, log) {
  let release = null;
  try {

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await ensureFileExists(filePath, '');
    
    release = await lockfile.lock(filePath, LOCK_OPTIONS);

    // Convierte el log a string y lo añade al archivo
    const logString = JSON.stringify(log, null, 2) + '\n';
    await fs.appendFile(filePath, logString, 'utf8');
  }

  catch (error) {
    console.error(`Error appending log to ${filePath}:`, error);
    throw error;
  } finally {
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('Error releasing write lock:', releaseError);
      }
    }
  }
}


// < -------------------------------------- POST REQUESTS -------------------------------------- >

await migrateExistingUsers();

// Cuando se accede a :username, se intenta  sacar los logs
app.get('/api/logs/:username', async (req, res) => {
  try {
    const { username } = req.params; //extrae el  usuario de  la  url
    const filePath = path.join(LOGS_DIR, `${username}.json`);
    
    console.log(`[Server] Attempting to read logs for user: ${username}`);
    console.log(`[Server] Log file path: ${filePath}`);
    
    // Ensure the log file exists before reading
    await ensureFileExists(filePath, '');
    
    const logs = await readLogsFromFile(filePath);
    console.log(`[Server] Successfully read ${logs.length} logs for user: ${username}`);
    res.json(logs);
  }

  catch (error) {
    console.error('[Server] Error reading logs:', error);
    res.status(500).json({ error: 'Error reading logs' });
  }
});

// Save logs for a user (now only used for recovery/migration)
app.post('/api/logs/:username', async (req, res) => {
  let release = null;
  try {
    const { username } = req.params;
    const logs = req.body;
    const filePath = path.join(LOGS_DIR, `${username}.json`);
    
    // Acquire an exclusive (write) lock
    release = await lockfile.lock(filePath, LOCK_OPTIONS);

    // Create a backup before overwriting
    try {
      const backupPath = `${filePath}.backup`;
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error creating backup:', error);
      }
    }

    // Write logs with indentation for human readability
    const fileContent = logs.map(log => JSON.stringify(log, null, 2)).join('\n\n') + '\n\n';
    await fs.writeFile(filePath, fileContent);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving logs:', error);
    res.status(500).json({ error: 'Error saving logs' });
  } finally {
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('Error releasing write lock:', releaseError);
      }
    }
  }
});

// Se ejecuta cuando se crea un nuevo usuario
app.post('/api/logs/:username/add', async (req, res) => {
  try {
    const { username } = req.params;
    const newLog = req.body;
    const filePath = path.join(LOGS_DIR, `${username}.json`);
    
    await appendLog(filePath, newLog);
    res.json({ success: true });
  } catch (error) {
    console.error('Error appending log:', error);
    res.status(500).json({ error: 'Error appending log' });
  }
});

// Se ejecuta cuando se borra un usuario
app.delete('/api/logs/:username', async (req, res) => {
  let release = null;
  try {
    const { username } = req.params;
    const filePath = path.join(LOGS_DIR, `${username}.json`);
    
    // Acquire an exclusive (write) lock
    release = await lockfile.lock(filePath, LOCK_OPTIONS);

    // Create a backup before deleting
    try {
      const backupPath = `${filePath}.backup`;
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error creating backup:', error);
      }
    }
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    // Aunque se borran los  logs no se elimina el usuario de users.json aunque
    // Se  vacien los logs
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: 'Error clearing logs' });
  } finally {
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('Error releasing write lock:', releaseError);
      }
    }
  }
});

// Esto es  lo mismo pero si se quiere  borrar el usuario  (creo que no  se usa)
app.delete('/api/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Remove log file
    const logFilePath = path.join(LOGS_DIR, `${username}.json`);
    try {
      await fs.unlink(logFilePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error removing log file:', error);
      }
    }
    
    // Remove timer state file
    const timerStateFilePath = path.join(TIMER_STATE_DIR, `${username}.json`);
    try {
      await fs.unlink(timerStateFilePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error removing timer state file:', error);
      }
    }
    
    // Remove from persistent user list
    try {
      const users = await getPersistentUsers();
      const updatedUsers = users.filter(u => u !== username);
      await safeWriteJson(USERS_FILE, updatedUsers);
      console.log(`[Server] Removed user ${username} from persistent list`);
    } catch (error) {
      console.error('Error removing user from persistent list:', error);
    }
    
    res.json({ success: true, message: `User ${username} completely removed` });
  } catch (error) {
    console.error('Error removing user:', error);
    res.status(500).json({ error: 'Error removing user' });
  }
});

// Iniciar un intervalo de inactividad (se tira  el post desde  app.jsx, ahi está
// la  logica de cuando, esto solo ejecuta l a accion)
app.post('/api/inactive-interval/start/:username', async (req, res) => {
  try {
    // Se coge  el usuario y el tiempo
    const { username } = req.params;
    const { timestamp } = req.body;
    
    const intervals = await safeReadJson(INACTIVE_INTERVALS_FILE) || {};
    
    // Se  define el intervalo inactivo y se guarda en  inactive_intervals.json
    intervals[username] = {
      startTime: timestamp,
      isActive: true
    };
    
    await safeWriteJson(INACTIVE_INTERVALS_FILE, intervals);
    res.json({ success: true });
  } catch (error) {
    console.error('Error al iniciar intervalo de inactividad:', error);
    res.status(500).json({ error: 'Error al iniciar intervalo de inactividad' });
  }
});

// Verificar y finalizar intervalo de inactividad pendiente
app.post('/api/inactive-interval/end/:username', async (req, res) => {
  try {

    // Se coge  el usuario y el tiempo
    const { username } = req.params;
    const { timestamp } = req.body;
    
    const intervals = await safeReadJson(INACTIVE_INTERVALS_FILE) || {};
    
    // Se busca si hay un intervalo pendiente para el usuario
    const pendingInterval = intervals[username];
    let inactiveLog = null;
    
    if (pendingInterval && pendingInterval.isActive) {
      const duration = currentTime - pendingInterval.startTime;
      
      if (duration > 0) {
        inactiveLog = {
          type: 'inactive',
          duration: duration,
          timestamp: pendingInterval.startTime,
          endTimestamp: currentTime,
          username: username
        };
        
        // Añadir el log a los registros del usuario
        const userLogsPath = path.join(LOGS_DIR, `${username}.json`);
        await appendLog(userLogsPath, inactiveLog);
      }
      
      // Limpiar el intervalo pendiente
      delete intervals[username];
      await safeWriteJson(INACTIVE_INTERVALS_FILE, intervals);
    }
    
    res.json({ 
      success: true, 
      inactiveLog,
      hadPendingInterval: !!pendingInterval?.isActive
    });
  } catch (error) {
    console.error('Error al finalizar intervalo de inactividad:', error);
    res.status(500).json({ error: 'Error al finalizar intervalo de inactividad' });
  }
});

// Obtener el estado del timer  por  si se reinicia la  pagina
app.get('/api/timer-state/:username', async (req, res) => {
  const { username } = req.params;
  const filePath = path.join(TIMER_STATE_DIR, `${username}.json`);
  
  try {
    // Ensure the timer state file exists
    await ensureFileExists(filePath, '{}');
    
    const state = await safeReadJson(filePath);
    
    // Validate state structure
    if (state && typeof state === 'object') {
      const validState = {
        time: typeof state.time === 'number' ? state.time : 0,
        lastUpdate: typeof state.lastUpdate === 'number' ? state.lastUpdate : Date.now(),
        wasPaused: Boolean(state.wasPaused),
        wasRunning: Boolean(state.wasRunning),
        isActiveTrackingMode: state.isActiveTrackingMode !== undefined ? Boolean(state.isActiveTrackingMode) : true
      };
      res.json(validState);
    } else {
        res.json(null);
    }
  } catch (error) {
    console.error('Error reading timer state:', error);
    // Return a safe default state
    res.json({
      time: 0,
      lastUpdate: Date.now(),
      wasPaused: true,
      wasRunning: false,
      isActiveTrackingMode: true
    });
  }
});

// Se guarda el  timer  por si se cierra  la pagina o  se  pausa el timer
app.post('/api/timer-state/:username', async (req, res) => {
  const { username } = req.params;
  const state = req.body;
  const filePath = path.join(TIMER_STATE_DIR, `${username}.json`);
  
  try {
    // Validate and sanitize state before saving
    const validState = {
      time: typeof state.time === 'number' ? state.time : 0,
      lastUpdate: typeof state.lastUpdate === 'number' ? state.lastUpdate : Date.now(),
      wasPaused: Boolean(state.wasPaused),
      wasRunning: Boolean(state.wasRunning), // para ver si  tiene que empezar corriendo
      isActiveTrackingMode: state.isActiveTrackingMode !== undefined ? Boolean(state.isActiveTrackingMode) : true
    };
    // El ultimo apartado es para ver en  que estado estaba  (ahora mismo  solo funciona active)
    await safeWriteJson(filePath, validState);
    res.json({ success: true, state: validState });
  } catch (error) {
    console.error('Error saving timer state:', error);
    res.status(500).json({ 
      error: 'Error saving timer state',
      details: error.message
    });
  }
});

// Para limpiar el timer por si se reinicia 
app.delete('/api/timer-state/:username', async (req, res) => {
  let release = null;
  try {
  const { username } = req.params;
  const filePath = path.join(TIMER_STATE_DIR, `${username}.json`);
  
    // Acquire an exclusive (write) lock
    release = await lockfile.lock(filePath, LOCK_OPTIONS);

    // Create backup before deleting
    try {
      const backupPath = `${filePath}.backup`;
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error creating backup:', error);
      }
    }

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing timer state:', error);
    res.status(500).json({ error: 'Error clearing timer state' });
  } finally {
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('Error releasing write lock:', releaseError);
      }
    }
  }
});

// Se crea archivo de logs y timer state para un nuevo usuario
app.post('/api/init-user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Add user to persistent list
    await addUserToList(username);
    
    // Create log file
    const logFilePath = path.join(LOGS_DIR, `${username}.json`);
    await ensureFileExists(logFilePath, '');
    
    // Create timer state file with default state
    const timerStateFilePath = path.join(TIMER_STATE_DIR, `${username}.json`);
    const defaultState = {
      time: 0,
      lastUpdate: Date.now(),
      wasPaused: true,
      wasRunning: false,
      isActiveTrackingMode: true
    };
    await ensureFileExists(timerStateFilePath, JSON.stringify(defaultState, null, 2));
    
    console.log(`[Server] Initialized files for user: ${username}`);
    res.json({ 
      success: true, 
      message: `User ${username} initialized successfully`,
      files: {
        logFile: logFilePath,
        timerStateFile: timerStateFilePath
      }
    });
  } catch (error) {
    console.error('Error initializing user:', error);
    res.status(500).json({ error: 'Error initializing user files' });
  }
});

// Para ver si el servidor está vivo
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Esto se llama para mostrar la seleccion de usuarios en  el  select de  app.jsx
app.get('/api/users', async (req, res) => {
  try {
    // Start with persistent user list
    const persistentUsers = await getPersistentUsers();
    const users = new Set(persistentUsers);
    
    // Check for users with log files
    try {
      const logFiles = await fs.readdir(LOGS_DIR);
      for (const file of logFiles) {
        if (file.endsWith('.json')) {
          const username = file.replace('.json', '');
          users.add(username);
          // Add to persistent list if not already there
          await addUserToList(username);
        }
      }
    } catch (error) {
      // Logs directory doesn't exist yet
      console.log('Logs directory not found');
    }
    
    // Check for users with timer states
    try {
      const stateFiles = await fs.readdir(TIMER_STATE_DIR);
      for (const file of stateFiles) {
        if (file.endsWith('.json')) {
          const username = file.replace('.json', '');
          users.add(username);
          // Add to persistent list if not already there
          await addUserToList(username);
        }
      }
    } catch (error) {
      // Timer states directory doesn't exist yet
      console.log('Timer states directory not found');
    }
    
    res.json(Array.from(users).sort());
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Error getting users' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
}); 