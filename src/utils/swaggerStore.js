import fs from 'fs';
import path from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { config } from './config.js';
import { logger } from './logger.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

const specsMap = new Map();
let endpointsIndex = [];
let schemasIndex = [];

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

export async function loadAllSwaggers(dir = config.swaggersDir) {
  const filePaths = findSwaggerFiles(dir);
  specsMap.clear();
  endpointsIndex = [];
  schemasIndex = [];

  logger.info({ dir, filesFound: filePaths.length }, 'Iniciando escaneo y dereference de archivos Swagger/OpenAPI');

  for (const filePath of filePaths) {
    try {
      const fileName = path.basename(filePath);
      const specId = path.parse(fileName).name.toLowerCase();

      // Dereference completo usando @apidevtools/swagger-parser
      const api = await SwaggerParser.dereference(filePath);

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

      specsMap.set(specId, specEntry);

      // Indexar Endpoints (Totalmente dereferenciados)
      for (const [routePath, pathItem] of Object.entries(paths)) {
        if (!pathItem || typeof pathItem !== 'object') continue;

        const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
        for (const method of methods) {
          const operation = pathItem[method];
          if (!operation || typeof operation !== 'object') continue;

          endpointsIndex.push({
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

      // Indexar Schemas / Modelos de Datos (Totalmente dereferenciados)
      for (const [schemaName, schemaObj] of Object.entries(componentsSchemas)) {
        if (!schemaObj || typeof schemaObj !== 'object') continue;

        schemasIndex.push({
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

      logger.info({ specId, title, version, paths: specEntry.pathsCount, schemas: specEntry.schemasCount }, 'Swagger dereferenciado y cargado en memoria');
    } catch (error) {
      logger.error({ filePath, error: error.message }, 'Error al dereferenciar archivo Swagger/OpenAPI');
    }
  }

  logger.info(
    {
      totalSpecs: specsMap.size,
      totalEndpoints: endpointsIndex.length,
      totalSchemas: schemasIndex.length
    },
    'Carga y aprendizaje de documentación Swagger completado con éxito'
  );

  return {
    specsCount: specsMap.size,
    endpointsCount: endpointsIndex.length,
    schemasCount: schemasIndex.length
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

  // Filtrar endpoints por query
  const matchedEndpoints = endpointMatches.filter(e => {
    return (
      e.path.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.operationId.toLowerCase().includes(q) ||
      e.tags.some(tagItem => tagItem.toLowerCase().includes(q))
    );
  });

  // Filtrar schemas por query
  const matchedSchemas = schemaMatches.filter(s => {
    return (
      s.schemaName.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      Object.keys(s.properties).some(prop => prop.toLowerCase().includes(q))
    );
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

  const normalizedPath = routePath.trim();
  const normalizedMethod = (method || 'GET').toUpperCase().trim();

  let candidates = endpointsIndex.filter(e => {
    const methodMatch = e.method === normalizedMethod;
    const pathMatch = e.path.toLowerCase() === normalizedPath.toLowerCase() || e.path === normalizedPath;
    return methodMatch && pathMatch;
  });

  if (specId) {
    const sId = String(specId).toLowerCase();
    candidates = candidates.filter(e => e.specId === sId);
  }

  if (candidates.length === 0) {
    throw new NotFoundError(
      `No se encontró el endpoint '${normalizedMethod} ${normalizedPath}'${specId ? ` en el spec '${specId}'` : ''}.`
    );
  }

  return candidates[0];
}

export function getSchemaDoc({ schemaName, specId = null }) {
  if (!schemaName || typeof schemaName !== 'string') {
    throw new ValidationError('El parámetro "schemaName" es requerido.');
  }

  const normalizedName = schemaName.trim().toLowerCase();

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
    specs: getLoadedSpecs()
  };
}

export function clearStoreForTests() {
  specsMap.clear();
  endpointsIndex = [];
  schemasIndex = [];
}
