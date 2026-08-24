import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import SwaggerParser from '@apidevtools/swagger-parser';
import { config } from './config.js';
import { logger } from './logger.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

const CACHE_DIR = path.resolve(process.cwd(), '.cache/swaggers');

const specsMap = new Map();
let endpointsIndex = [];
let schemasIndex = [];

// Índices en memoria O(1)
const endpointLookupMap = new Map();
const schemaLookupMap = new Map();

let cacheStats = {
  hits: 0,
  misses: 0,
  totalSavedMs: 0
};

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function computeFileHash(filePath) {
  const stat = fs.statSync(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  return crypto
    .createHash('sha256')
    .update(fileBuffer)
    .update(String(stat.size))
    .update(String(stat.mtimeMs))
    .digest('hex');
}

function getCacheFilePath(specId, hash) {
  return path.join(CACHE_DIR, `${specId}-${hash.substring(0, 16)}.snapshot.json`);
}

function loadCachedSnapshot(specId, hash) {
  try {
    const cacheFile = getCacheFilePath(specId, hash);
    if (fs.existsSync(cacheFile)) {
      const content = fs.readFileSync(cacheFile, 'utf8');
      const snapshot = JSON.parse(content);
      if (snapshot.hash === hash && snapshot.specEntry && snapshot.endpoints && snapshot.schemas) {
        return snapshot;
      }
    }
  } catch (err) {
    logger.warn({ specId, error: err.message }, 'No se pudo leer el snapshot de caché; se procederá a dereferenciar');
  }
  return null;
}

function saveCachedSnapshot(specId, hash, snapshotData) {
  try {
    ensureCacheDir();
    const cacheFile = getCacheFilePath(specId, hash);
    const tempFile = `${cacheFile}.tmp-${Date.now()}`;
    const payload = JSON.stringify({
      hash,
      specId,
      cachedAt: new Date().toISOString(),
      ...snapshotData
    });
    fs.writeFileSync(tempFile, payload, 'utf8');
    fs.renameSync(tempFile, cacheFile);
  } catch (err) {
    logger.warn({ specId, error: err.message }, 'Error al guardar el snapshot en caché');
  }
}

export function clearSwaggerCache() {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        if (file.endsWith('.snapshot.json')) {
          fs.unlinkSync(path.join(CACHE_DIR, file));
        }
      }
    }
    cacheStats = { hits: 0, misses: 0, totalSavedMs: 0 };
    logger.info('Caché de snapshots de Swagger eliminada correctamente');
  } catch (err) {
    logger.error({ error: err.message }, 'Error al limpiar caché de Swagger');
  }
}

export function getCacheStats() {
  return { ...cacheStats };
}

function findSwaggerFiles(dirPath) {
  const resolved = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(resolved)) {
    return [];
  }

  const results = [];
  const entries = fs.readdirSync(resolved, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(resolved, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSwaggerFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.yml', '.yaml', '.json'].includes(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function sanitizeMissingRefs(apiObj) {
  if (!apiObj || typeof apiObj !== 'object') return;
  if (!apiObj.components) apiObj.components = {};
  if (!apiObj.components.schemas) apiObj.components.schemas = {};

  const schemas = apiObj.components.schemas;

  function traverse(node) {
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (k === '$ref' && typeof v === 'string') {
        if (v.startsWith('#/components/schemas/')) {
          const schemaName = v.replace('#/components/schemas/', '');
          if (!schemas[schemaName]) {
            schemas[schemaName] = {
              type: 'object',
              description: `Auto-generated stub for ${schemaName}`
            };
          }
        }
      } else {
        traverse(v);
      }
    }
  }

  traverse(apiObj);
}

async function processSingleSwaggerFile(filePath, forceReload = false) {
  const fileName = path.basename(filePath);
  const specId = path.parse(fileName).name.toLowerCase();
  const fileHash = computeFileHash(filePath);

  const fileStart = performance.now();

  // 1. Intentar cargar desde Snapshot Cache si no es forceReload
  if (!forceReload) {
    const cached = loadCachedSnapshot(specId, fileHash);
    if (cached) {
      cacheStats.hits++;
      const duration = (performance.now() - fileStart).toFixed(2);
      logger.info({ specId, durationMs: duration, source: 'CACHE_SNAPSHOT' }, 'Swagger cargado hiper-rápido desde snapshot en caché');
      return {
        specEntry: cached.specEntry,
        endpoints: cached.endpoints,
        schemas: cached.schemas,
        fromCache: true
      };
    }
  }

  cacheStats.misses++;
  logger.info({ specId, filePath, source: 'FULL_PARSE' }, 'Parseando y dereferenciando archivo OpenAPI');

  let parsedSpec;
  if (filePath.endsWith('.json')) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    parsedSpec = JSON.parse(fileContent);
  } else {
    parsedSpec = await SwaggerParser.parse(filePath);
  }

  // Sanitizar referencias internas faltantes antes del dereference
  sanitizeMissingRefs(parsedSpec);

  // Dereference completo usando @apidevtools/swagger-parser
  const api = await SwaggerParser.dereference(parsedSpec);

  const title = api.info?.title || fileName;
  const version = api.info?.version || '1.0.0';
  const description = api.info?.description || '';
  const openapiVersion = api.openapi || api.swagger || '3.0.0';
  const servers = api.servers || [];
  const securitySchemes = api.components?.securitySchemes || api.securityDefinitions || {};

  const paths = api.paths || {};
  const componentsSchemas = api.components?.schemas || api.definitions || {};

  const specEntry = {
    id: specId,
    fileName,
    filePath: path.relative(process.cwd(), filePath),
    title,
    version,
    description,
    openapiVersion,
    servers,
    securitySchemes,
    pathsCount: Object.keys(paths).length,
    schemasCount: Object.keys(componentsSchemas).length,
    rawSpec: api
  };

  const fileEndpoints = [];
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

  for (const [routePath, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object') continue;

      fileEndpoints.push({
        specId,
        specTitle: title,
        servers,
        path: routePath,
        method: method.toUpperCase(),
        operationId: operation.operationId || `${method}_${routePath}`,
        summary: operation.summary || '',
        description: operation.description || '',
        tags: operation.tags || [],
        parameters: operation.parameters || pathItem.parameters || [],
        requestBody: operation.requestBody || null,
        responses: operation.responses || {},
        deprecated: Boolean(operation.deprecated),
        security: operation.security || api.security || []
      });
    }
  }

  const fileSchemas = [];
  for (const [schemaName, schemaObj] of Object.entries(componentsSchemas)) {
    if (!schemaObj || typeof schemaObj !== 'object') continue;

    fileSchemas.push({
      specId,
      specTitle: title,
      schemaName,
      type: schemaObj.type || 'object',
      description: schemaObj.description || '',
      properties: schemaObj.properties || {},
      required: schemaObj.required || [],
      enum: schemaObj.enum || null,
      rawSchema: schemaObj
    });
  }

  // Guardar en caché snapshot para futuros arranques instantáneos
  saveCachedSnapshot(specId, fileHash, {
    specEntry,
    endpoints: fileEndpoints,
    schemas: fileSchemas
  });

  const duration = (performance.now() - fileStart).toFixed(2);
  logger.info({ specId, durationMs: duration, paths: specEntry.pathsCount, schemas: specEntry.schemasCount }, 'Swagger dereferenciado y snapshot guardado en caché');

  return {
    specEntry,
    endpoints: fileEndpoints,
    schemas: fileSchemas,
    fromCache: false
  };
}

export async function loadAllSwaggers(dir = config.swaggersDir, options = {}) {
  const startTime = performance.now();
  const filePaths = findSwaggerFiles(dir);
  const force = Boolean(options.force);

  specsMap.clear();
  endpointsIndex = [];
  schemasIndex = [];
  endpointLookupMap.clear();
  schemaLookupMap.clear();

  logger.info({ dir, filesFound: filePaths.length, force }, 'Iniciando carga concurrente e hiper-rápida de especificaciones OpenAPI');

  // Procesamiento concurrente de todos los archivos
  const results = await Promise.all(
    filePaths.map(filePath =>
      processSingleSwaggerFile(filePath, force).catch(err => {
        logger.error({ filePath, error: err.message }, 'Error al procesar archivo Swagger/OpenAPI');
        return null;
      })
    )
  );

  // Hidratar estructuras e índices O(1)
  for (const result of results) {
    if (!result) continue;

    const { specEntry, endpoints, schemas } = result;
    specsMap.set(specEntry.id, specEntry);

    for (const ep of endpoints) {
      endpointsIndex.push(ep);
      const exactKey = `${ep.specId}:${ep.method}:${ep.path.toLowerCase()}`;
      const generalKey = `${ep.method}:${ep.path.toLowerCase()}`;
      endpointLookupMap.set(exactKey, ep);
      if (!endpointLookupMap.has(generalKey)) {
        endpointLookupMap.set(generalKey, ep);
      }
    }

    for (const sc of schemas) {
      schemasIndex.push(sc);
      const exactKey = `${sc.specId}:${sc.schemaName.toLowerCase()}`;
      const generalKey = `${sc.schemaName.toLowerCase()}`;
      schemaLookupMap.set(exactKey, sc);
      if (!schemaLookupMap.has(generalKey)) {
        schemaLookupMap.set(generalKey, sc);
      }
    }
  }

  const totalDuration = (performance.now() - startTime).toFixed(2);

  logger.info(
    {
      totalSpecs: specsMap.size,
      totalEndpoints: endpointsIndex.length,
      totalSchemas: schemasIndex.length,
      durationMs: totalDuration,
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses
    },
    'Carga hiper-rápida de documentación OpenAPI completada con éxito'
  );

  return {
    specsCount: specsMap.size,
    endpointsCount: endpointsIndex.length,
    schemasCount: schemasIndex.length,
    durationMs: totalDuration,
    cacheHits: cacheStats.hits,
    cacheMisses: cacheStats.misses
  };
}

export function getLoadedSpecs() {
  return Array.from(specsMap.values()).map(s => ({
    id: s.id,
    fileName: s.fileName,
    filePath: s.filePath,
    title: s.title,
    version: s.version,
    description: s.description,
    openapiVersion: s.openapiVersion,
    servers: s.servers,
    securitySchemes: s.securitySchemes,
    pathsCount: s.pathsCount,
    schemasCount: s.schemasCount
  }));
}

export function getSpec(specId) {
  if (!specId) return null;
  const normalized = String(specId).toLowerCase();
  return specsMap.get(normalized) || null;
}

export function searchDocs({ query, specId = null, tag = null, limit = 10 }) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new ValidationError('El parámetro "query" es requerido.');
  }

  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(t => t.length > 2);
  const maxLimit = Math.min(Math.max(parseInt(limit || '10', 10), 1), 50);

  let endpointMatches = endpointsIndex;
  let schemaMatches = schemasIndex;

  if (specId) {
    const sId = String(specId).toLowerCase();
    endpointMatches = endpointMatches.filter(e => e.specId === sId);
    schemaMatches = schemaMatches.filter(s => s.specId === sId);
  }

  if (tag) {
    const t = String(tag).toLowerCase();
    endpointMatches = endpointMatches.filter(e => e.tags.some(tagItem => tagItem.toLowerCase().includes(t)));
  }

  // Filtrar endpoints por query completa o tokens
  const matchedEndpoints = endpointMatches.filter(e => {
    const fullText = `${e.path} ${e.summary} ${e.description} ${e.operationId} ${e.tags.join(' ')}`.toLowerCase();
    if (fullText.includes(q)) return true;
    return tokens.length > 0 && tokens.some(token => fullText.includes(token));
  });

  // Filtrar schemas por query completa o tokens
  const matchedSchemas = schemaMatches.filter(s => {
    const fullText = `${s.schemaName} ${s.description} ${Object.keys(s.properties).join(' ')}`.toLowerCase();
    if (fullText.includes(q)) return true;
    return tokens.length > 0 && tokens.some(token => fullText.includes(token));
  });

  return {
    query,
    totalEndpointsFound: matchedEndpoints.length,
    totalSchemasFound: matchedSchemas.length,
    endpoints: matchedEndpoints.slice(0, maxLimit).map(e => ({
      specId: e.specId,
      specTitle: e.specTitle,
      method: e.method,
      path: e.path,
      operationId: e.operationId,
      summary: e.summary,
      description: e.description,
      tags: e.tags
    })),
    schemas: matchedSchemas.slice(0, maxLimit).map(s => ({
      specId: s.specId,
      specTitle: s.specTitle,
      schemaName: s.schemaName,
      type: s.type,
      description: s.description,
      requiredProperties: s.required,
      propertyNames: Object.keys(s.properties)
    }))
  };
}

export function getEndpointDoc({ path: routePath, method = 'GET', specId = null }) {
  if (!routePath || typeof routePath !== 'string') {
    throw new ValidationError('El parámetro "path" es requerido.');
  }

  const normalizedPath = routePath.trim().toLowerCase();
  const normalizedMethod = (method || 'GET').toUpperCase().trim();

  // Búsqueda instantánea O(1)
  if (specId) {
    const exactKey = `${String(specId).toLowerCase()}:${normalizedMethod}:${normalizedPath}`;
    const found = endpointLookupMap.get(exactKey);
    if (found) return found;
  } else {
    const generalKey = `${normalizedMethod}:${normalizedPath}`;
    const found = endpointLookupMap.get(generalKey);
    if (found) return found;
  }

  // Fallback con escaneo si hay variantes de formato
  let candidates = endpointsIndex.filter(e => {
    const methodMatch = e.method === normalizedMethod;
    const pathMatch = e.path.toLowerCase() === normalizedPath;
    return methodMatch && pathMatch;
  });

  if (specId) {
    const sId = String(specId).toLowerCase();
    candidates = candidates.filter(e => e.specId === sId);
  }

  if (candidates.length === 0) {
    throw new NotFoundError(
      `No se encontró el endpoint '${normalizedMethod} ${routePath.trim()}'${specId ? ` en el spec '${specId}'` : ''}.`
    );
  }

  return candidates[0];
}

export function getSchemaDoc({ schemaName, specId = null }) {
  if (!schemaName || typeof schemaName !== 'string') {
    throw new ValidationError('El parámetro "schemaName" es requerido.');
  }

  const normalizedName = schemaName.trim().toLowerCase();

  // Búsqueda instantánea O(1)
  if (specId) {
    const exactKey = `${String(specId).toLowerCase()}:${normalizedName}`;
    const found = schemaLookupMap.get(exactKey);
    if (found) return found;
  } else {
    const found = schemaLookupMap.get(normalizedName);
    if (found) return found;
  }

  // Fallback con escaneo
  let candidates = schemasIndex.filter(s => s.schemaName.toLowerCase() === normalizedName);

  if (specId) {
    const sId = String(specId).toLowerCase();
    candidates = candidates.filter(s => s.specId === sId);
  }

  if (candidates.length === 0) {
    throw new NotFoundError(
      `No se encontró el schema '${schemaName}'${specId ? ` en el spec '${specId}'` : ''}.`
    );
  }

  return candidates[0];
}

export function getSecuritySchemes(specId = null) {
  const specs = getLoadedSpecs();
  if (specId) {
    const target = specs.find(s => s.id === String(specId).toLowerCase());
    if (!target) {
      throw new NotFoundError(`No se encontró la especificación '${specId}'.`);
    }
    return {
      specId: target.id,
      specTitle: target.title,
      securitySchemes: target.securitySchemes
    };
  }

  return {
    totalSpecsWithAuth: specs.filter(s => Object.keys(s.securitySchemes || {}).length > 0).length,
    schemesBySpec: specs.map(s => ({
      specId: s.id,
      specTitle: s.title,
      securitySchemes: s.securitySchemes
    }))
  };
}

export function validatePayloadAgainstSchema({ schemaName, payload, specId = null }) {
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('El parámetro "payload" debe ser un objeto JSON válido.');
  }

  const schemaDoc = getSchemaDoc({ schemaName, specId });
  const schema = schemaDoc.rawSchema;

  const errors = [];
  const requiredFields = schema.required || [];

  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null) {
      errors.push(`Campo obligatorio faltante: "${field}"`);
    }
  }

  if (schema.properties) {
    for (const [propName, propVal] of Object.entries(payload)) {
      const propDef = schema.properties[propName];
      if (propDef && propDef.type) {
        const valType = Array.isArray(propVal) ? 'array' : typeof propVal;
        if (propDef.type === 'integer' || propDef.type === 'number') {
          if (typeof propVal !== 'number') {
            errors.push(`Tipo de dato inválido para "${propName}": esperado ${propDef.type}, recibido ${valType}`);
          }
        } else if (propDef.type !== valType) {
          errors.push(`Tipo de dato inválido para "${propName}": esperado ${propDef.type}, recibido ${valType}`);
        }

        if (propDef.enum && !propDef.enum.includes(propVal)) {
          errors.push(`Valor inválido para "${propName}": debe ser uno de [${propDef.enum.join(', ')}]`);
        }
      }
    }
  }

  return {
    schemaName: schemaDoc.schemaName,
    specId: schemaDoc.specId,
    isValid: errors.length === 0,
    errorsCount: errors.length,
    errors,
    payloadChecked: payload
  };
}

export function queryApiKnowledge({ query, specId = null }) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new ValidationError('El parámetro "query" es requerido para consultar el conocimiento.');
  }

  const searchResults = searchDocs({ query, specId, limit: 10 });
  const specs = getLoadedSpecs();

  return {
    query,
    contextSummary: `Conocimiento extraído de ${specs.length} especificaciones OpenAPI aprendidas en memoria.`,
    loadedApis: specs.map(s => `${s.title} (v${s.version}) - ${s.pathsCount} rutas`),
    relevantEndpoints: searchResults.endpoints,
    relevantSchemas: searchResults.schemas,
    synthesizedOverview: `Se encontraron ${searchResults.totalEndpointsFound} endpoints y ${searchResults.totalSchemasFound} modelos de datos relacionados con '${query}'.`
  };
}

export function getStoreStats() {
  return {
    specsCount: specsMap.size,
    endpointsCount: endpointsIndex.length,
    schemasCount: schemasIndex.length,
    cache: getCacheStats(),
    specs: getLoadedSpecs()
  };
}

export function clearStoreForTests() {
  specsMap.clear();
  endpointsIndex = [];
  schemasIndex = [];
  endpointLookupMap.clear();
  schemaLookupMap.clear();
}
