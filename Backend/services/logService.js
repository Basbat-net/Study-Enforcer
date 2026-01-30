// Servicios llamados por la api y el servidor para gestionar los logs

// Funciones:
//  - readLogsFromFile  - Lee todos los logs de un archivo
//  - appendLog         - Añade un log al final del archivo
//  - writeLogsToFile  - Sobrescribe el archivo con un array de logs

import fs from 'fs/promises';
import path from 'path';
import lockfile from 'proper-lockfile';
import { LOCK_OPTIONS } from '../config/index.js';
import { ensureFileExists} from '../utils/fileUtils.js';

export async function readLogsFromFile(filePath) {
  let release = null;
  try {
    await ensureFileExists(filePath, '');
    
    // el lock
    release = await lockfile.lock(filePath, { 
      ...LOCK_OPTIONS,
      shared: true
    });

    const logs = [];
    
    // miramos si está vacio
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      return logs;
    }
    
    // lo parseamos
    const fileContent = await fs.readFile(filePath, 'utf8');
    const jsonBlocks = fileContent.split('\n\n').filter(block => block.trim());
    
    // le hacemos mierdas y cosas no se viva la republica del congo
    for (const block of jsonBlocks) {
      if (block.trim()) {
        try {
          const logEntry = JSON.parse(block.trim());
          logs.push(logEntry);
        }
        catch (error) {
          console.error('[LogService] Error parsing log entry:', error);
          console.error('[LogService] Problematic JSON string:', block);
          
          // Fallback: try to parse line by line for older format compatibility
          const lines = block.split('\n');
          let currentJsonString = '';
          let braceCount = 0;
          
          for (const line of lines) {
            if (line.trim()) {
              currentJsonString += line + '\n';
              
              for (const char of line) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
              }
              
              if (braceCount === 0 && currentJsonString.trim()) {
                try {
                  const logEntry = JSON.parse(currentJsonString.trim());
                  logs.push(logEntry);
                } catch (fallbackError) {
                  console.error('[LogService] Fallback parsing also failed:', fallbackError);
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
    console.error(`[LogService] Error reading logs from ${filePath}:`, error);
    return [];
  }
  finally {
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('[LogService] Error releasing read lock:', releaseError);
      }
    }
  }
}

// append de log sin reescribir todo el archivo
export async function appendLog(filePath, log) {
  let release = null;
  try {
    const dir = path.dirname(filePath);
    // probamos a crear el directorio si no existe
    await fs.mkdir(dir, { recursive: true });
    await ensureFileExists(filePath, '');
    
    release = await lockfile.lock(filePath, LOCK_OPTIONS);

    const logString = JSON.stringify(log, null, 2) + '\n';
    // append y tocotó
    await fs.appendFile(filePath, logString, 'utf8');
  }
  catch (error) {
    console.error(`[LogService] Error appending log to ${filePath}:`, error);
    throw error;
  } finally {
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('[LogService] Error releasing write lock:', releaseError);
      }
    }
  }
}

// reescribimos todo el archivo
// CUIDADO CON ESTA FUNCION, SI NO SE USA BIEN, SE PUEDE COMER TODO EL ARCHIVO
export async function writeLogsToFile(filePath, logs) {
  let release = null;
  try {
    // comporbamos que existe (si no lo crea)
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await ensureFileExists(filePath, '');
    release = await lockfile.lock(filePath, LOCK_OPTIONS);

    try {
      // creamos un backup antes de escribir
      const backupPath = `${filePath}.backup`;
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('[LogService] Error creating backup:', error);
    }

    // lo escribimos
    const fileContent = logs.map(log => JSON.stringify(log, null, 2)).join('\n\n') + '\n\n';
    await fs.writeFile(filePath, fileContent, 'utf8');
  } catch (error) {
    console.error(`[LogService] Error writing logs to ${filePath}:`, error);
    throw error;
  } finally {
    // el backup no se borra porsiaca
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('[LogService] Error releasing write lock:', releaseError);
      }
    }
  }
}


