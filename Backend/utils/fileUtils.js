// en este archivo se meten las funciones estaticas que se reutilizan en sitios 
// y que no hacen logica especifica, solo ayudas generales

// Funciones importantes:
//  - ensureFileExists, // Asegura que un archivo exista, y si no existe, 
//                        lo crea con el 2o parametro como contenido
//                        solo returnea error en caso de que pase algo, si no no hace nada
//  - safeReadJson, // Lee un archivo JSON de forma segura con async usando un lock
//                     intenta recuperarlo si está corrupto, y si falla devuelve un null
//  - safeWriteJson, // Escribe un archivo JSON de forma segura con async usando un lock
//                      En vez de reescribir, genera un temp y lo reescribe para evitar cosas
//  - safeDeleteFile, // Borra un archivo con un lock y le hace un backup antes de borrar porsiaca

import fs from 'fs/promises';
import path from 'path';
import lockfile from 'proper-lockfile';
import { LOCK_OPTIONS } from '../config/index.js';

export async function ensureFileExists(filePath, defaultContent = '') {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const dir = path.dirname(filePath);
      console.log(`[FileUtils] Creating directory: ${dir}`);
      await fs.mkdir(dir, { recursive: true });
      console.log(`[FileUtils] Creating file: ${filePath}`);
      await fs.writeFile(filePath, defaultContent, 'utf8');
      console.log(`[FileUtils] File created successfully: ${filePath}`);
    } else {
      console.error(`[FileUtils] Error accessing file ${filePath}:`, error);
      throw error;
    }
  }
}

export async function safeReadJson(filePath) {
  let release = null;
  try {
    await ensureFileExists(filePath, '{}');
    
    // Acquire shared lock (allows other reads, blocks writes)
    release = await lockfile.lock(filePath, { 
      ...LOCK_OPTIONS,
      shared: true
    });

    const content = await fs.readFile(filePath, 'utf8');
    const cleanContent = content.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
    return JSON.parse(cleanContent);
  }
  catch (error) {
    console.error(`[FileUtils] Error reading JSON file ${filePath}:`, error);
    // Try to recover corrupted JSON
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const matches = content.match(/\{[^}]*\}/g);
      if (matches && matches.length > 0) {
        const lastValidJson = matches[matches.length - 1];
        return JSON.parse(lastValidJson);
      }
    } catch (recoveryError) {
      console.error('[FileUtils] Recovery attempt failed:', recoveryError);
    }
    return null;
  }
  finally {
    if (release) {
      try {
        await release();
      }
      catch (releaseError) {
        console.error('[FileUtils] Error releasing read lock:', releaseError);
      }
    }
  }
}

export async function safeWriteJson(filePath, data) {
  let release = null;
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await ensureFileExists(filePath, '{}');
    
    // Acquire exclusive lock (blocks all other operations)
    release = await lockfile.lock(filePath, LOCK_OPTIONS);

    // Create backup before modifying
    try {
      const backupPath = `${filePath}.backup`;
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[FileUtils] Error creating backup:', error);
      }
    }

    // Validate JSON before writing
    const jsonString = JSON.stringify(data, null, 2);
    JSON.parse(jsonString); // Validate

    // Write to temp file then rename (atomic operation)
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, jsonString + '\n');
    await fs.rename(tempPath, filePath);
  }
  catch (error) {
    console.error(`[FileUtils] Error writing JSON file ${filePath}:`, error);
    // Try to restore from backup
    try {
      const backupPath = `${filePath}.backup`;
      await fs.copyFile(backupPath, filePath);
    } catch (restoreError) {
      console.error('[FileUtils] Error restoring from backup:', restoreError);
    }
    throw error;
  }
  finally {
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('[FileUtils] Error releasing write lock:', releaseError);
      }
    }
  }
}


export async function safeDeleteFile(filePath) {
  let release = null;
  try {
    await ensureFileExists(filePath, '');
    release = await lockfile.lock(filePath, LOCK_OPTIONS);

    // Create backup before deleting
    try {
      const backupPath = `${filePath}.backup`;
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[FileUtils] Error creating backup:', error);
      }
    }

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  } finally {
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error('[FileUtils] Error releasing write lock:', releaseError);
      }
    }
  }
}
