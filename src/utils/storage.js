import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { logger } from './logger.js';
import { getStats, setStats } from './metrics.js';

let debounceTimer = null;
const DEBOUNCE_MS = 300;

function ensureDirSync(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveStatsPath() {
  const target = config.statsStoragePath;
  if (path.isAbsolute(target)) return target;
  const cwdPath = path.resolve(process.cwd(), target);
  if (fs.existsSync(cwdPath)) return cwdPath;
  return path.resolve(config.projectRoot, target);
}

export function loadStatsFromDisk() {
  if (!config.statsStorageEnabled) return;

  try {
    const fullPath = resolveStatsPath();
    if (fs.existsSync(fullPath)) {
      const data = fs.readFileSync(fullPath, 'utf8');
      const parsed = JSON.parse(data);
      setStats(parsed);
      logger.info({ path: config.statsStoragePath }, 'Estadísticas cargadas desde disco exitosamente.');
    }
  } catch (error) {
    logger.warn({ error: error.message, path: config.statsStoragePath }, 'No se pudieron cargar las estadísticas previas de disco.');
  }
}

export function saveStatsSync() {
  if (!config.statsStorageEnabled) return;

  try {
    const fullPath = resolveStatsPath();
    ensureDirSync(fullPath);

    const tempPath = `${fullPath}.${Date.now()}.tmp`;
    const payload = JSON.stringify(getStats(), null, 2);

    fs.writeFileSync(tempPath, payload, 'utf8');
    fs.renameSync(tempPath, fullPath);
  } catch (error) {
    logger.error({ error: error.message, path: config.statsStoragePath }, 'Error en guardado síncrono de estadísticas.');
  }
}

export function scheduleStatsSave() {
  if (!config.statsStorageEnabled) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    saveStatsSync();
  }, DEBOUNCE_MS);
}

let isCleanedUp = false;
export function setupStorageLifecycle() {
  loadStatsFromDisk();

  const flushAndExit = (signal) => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    saveStatsSync();
    logger.info({ signal }, 'Persistencia de estadísticas completada durante apagado.');
  };

  process.once('SIGINT', () => {
    flushAndExit('SIGINT');
  });

  process.once('SIGTERM', () => {
    flushAndExit('SIGTERM');
  });

  process.once('beforeExit', () => {
    flushAndExit('beforeExit');
  });
}
