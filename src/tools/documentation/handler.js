import { toolExecutionDuration, toolRequestsTotal, recordActivity, estimateTokens } from '../../utils/metrics.js';
import { handleToolError } from '../../errors/index.js';
import { logger } from '../../utils/logger.js';
import { CircuitBreaker } from '../../utils/resilience.js';
import {
  getLoadedSpecs,
  searchDocs,
  getEndpointDoc,
  getSchemaDoc,
  getSecuritySchemes,
  validatePayloadAgainstSchema,
  queryApiKnowledge
} from '../../utils/swaggerStore.js';
import { generateIntegrationSnippet } from '../../utils/codeGenerator.js';

const swaggerBreaker = new CircuitBreaker({
  name: 'swagger_knowledge_store',
  failureThreshold: 5,
  cooldownMs: 15000
});

export async function listSpecsHandler(args = {}) {
  const startTime = Date.now();
  const timer = toolExecutionDuration.startTimer({ tool_name: 'list_specs' });

  try {
    logger.info('Listando especificaciones Swagger/OpenAPI aprendidas');

    const specs = await swaggerBreaker.execute(async () => {
      return getLoadedSpecs();
    });

    const responsePayload = {
      totalSpecs: specs.length,
      specs,
      timestamp: new Date().toISOString()
    };

    const responseText = JSON.stringify(responsePayload, null, 2);
    const duration_ms = Date.now() - startTime;

    toolRequestsTotal.inc({ tool_name: 'list_specs', status: 'success' });
    timer({ status: 'success' });

    recordActivity({
      tool_name: 'list_specs',
      status: 'SUCCESS',
      duration_ms,
      tokens: estimateTokens(responseText),
      details: `Specs cargados: ${specs.length}`
    });

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleToolError({
      toolName: 'list_specs',
      error,
      startTime,
      timer,
      logMessage: 'Fallo al listar especificaciones OpenAPI',
      prefix: 'Error en catálogo de Swagger'
    });
  }
}

export async function searchDocsHandler(args = {}) {
  const startTime = Date.now();
  const timer = toolExecutionDuration.startTimer({ tool_name: 'search_docs' });

  try {
    logger.info({ query: args?.query, specId: args?.specId, tag: args?.tag }, 'Ejecutando búsqueda documental en Swagger');

    const results = await swaggerBreaker.execute(async () => {
      return searchDocs({
        query: args?.query,
        specId: args?.specId,
        tag: args?.tag,
        limit: args?.limit
      });
    });

    const responsePayload = {
      ...results,
      retrievedAt: new Date().toISOString()
    };

    const responseText = JSON.stringify(responsePayload, null, 2);
    const duration_ms = Date.now() - startTime;

    toolRequestsTotal.inc({ tool_name: 'search_docs', status: 'success' });
    timer({ status: 'success' });

    recordActivity({
      tool_name: 'search_docs',
      status: 'SUCCESS',
      duration_ms,
      tokens: estimateTokens(responseText),
      details: `Query: ${args?.query} (endpoints: ${results.totalEndpointsFound}, schemas: ${results.totalSchemasFound})`
    });

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleToolError({
      toolName: 'search_docs',
      error,
      startTime,
      timer,
      logMessage: 'Fallo al buscar en documentación OpenAPI',
      prefix: 'Error en búsqueda documental'
    });
  }
}

export async function getEndpointDocHandler(args = {}) {
  const startTime = Date.now();
  const timer = toolExecutionDuration.startTimer({ tool_name: 'get_endpoint_doc' });

  try {
    logger.info({ path: args?.path, method: args?.method, specId: args?.specId }, 'Obteniendo endpoint dereferenciado');

    const endpointDoc = await swaggerBreaker.execute(async () => {
      return getEndpointDoc({
        path: args?.path,
        method: args?.method,
        specId: args?.specId
      });
    });

    const responsePayload = {
      endpoint: endpointDoc,
      retrievedAt: new Date().toISOString()
    };

    const responseText = JSON.stringify(responsePayload, null, 2);
    const duration_ms = Date.now() - startTime;

    toolRequestsTotal.inc({ tool_name: 'get_endpoint_doc', status: 'success' });
    timer({ status: 'success' });

    recordActivity({
      tool_name: 'get_endpoint_doc',
      status: 'SUCCESS',
      duration_ms,
      tokens: estimateTokens(responseText),
      details: `${endpointDoc.method} ${endpointDoc.path}`
    });

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleToolError({
      toolName: 'get_endpoint_doc',
      error,
      startTime,
      timer,
      logMessage: 'Fallo al obtener documentación de endpoint',
      prefix: 'Error al consultar endpoint'
    });
  }
}

export async function getSchemaDocHandler(args = {}) {
  const startTime = Date.now();
  const timer = toolExecutionDuration.startTimer({ tool_name: 'get_schema_doc' });

  try {
    logger.info({ schemaName: args?.schemaName, specId: args?.specId }, 'Obteniendo schema dereferenciado');

    const schemaDoc = await swaggerBreaker.execute(async () => {
      return getSchemaDoc({
        schemaName: args?.schemaName,
        specId: args?.specId
      });
    });

    const responsePayload = {
      schema: schemaDoc,
      retrievedAt: new Date().toISOString()
    };

    const responseText = JSON.stringify(responsePayload, null, 2);
    const duration_ms = Date.now() - startTime;

    toolRequestsTotal.inc({ tool_name: 'get_schema_doc', status: 'success' });
    timer({ status: 'success' });

    recordActivity({
      tool_name: 'get_schema_doc',
      status: 'SUCCESS',
      duration_ms,
      tokens: estimateTokens(responseText),
      details: `Schema: ${schemaDoc.schemaName}`
    });

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleToolError({
      toolName: 'get_schema_doc',
      error,
      startTime,
      timer,
      logMessage: 'Fallo al obtener schema OpenAPI',
      prefix: 'Error al consultar schema'
    });
  }
}

export async function generateIntegrationCodeHandler(args = {}) {
  const startTime = Date.now();
  const timer = toolExecutionDuration.startTimer({ tool_name: 'generate_integration_code' });

  try {
    logger.info({ path: args?.path, method: args?.method, language: args?.language }, 'Generando snippet de integración de código');

    const endpointDoc = await swaggerBreaker.execute(async () => {
      return getEndpointDoc({
        path: args?.path,
        method: args?.method,
        specId: args?.specId
      });
    });

    const primaryServerUrl = endpointDoc.servers && endpointDoc.servers.length > 0
      ? endpointDoc.servers[0].url
      : 'https://api.vivaaerobus.com';

    const codeSnippet = generateIntegrationSnippet({
      endpoint: endpointDoc,
      baseUrl: primaryServerUrl,
      language: args?.language || 'typescript',
      clientType: args?.clientType || 'fetch'
    });

    const responsePayload = {
      endpoint: `${endpointDoc.method} ${endpointDoc.path}`,
      language: args?.language || 'typescript',
      clientType: args?.clientType || 'fetch',
      baseUrl: primaryServerUrl,
      generatedCode: codeSnippet,
      timestamp: new Date().toISOString()
    };

    const responseText = JSON.stringify(responsePayload, null, 2);
    const duration_ms = Date.now() - startTime;

    toolRequestsTotal.inc({ tool_name: 'generate_integration_code', status: 'success' });
    timer({ status: 'success' });

    recordActivity({
      tool_name: 'generate_integration_code',
      status: 'SUCCESS',
      duration_ms,
      tokens: estimateTokens(responseText),
      details: `CodeGen: ${endpointDoc.method} ${endpointDoc.path} (${args?.language || 'typescript'})`
    });

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleToolError({
      toolName: 'generate_integration_code',
      error,
      startTime,
      timer,
      logMessage: 'Fallo al generar código de integración',
      prefix: 'Error en generador de código'
    });
  }
}

export async function getSecuritySchemesHandler(args = {}) {
  const startTime = Date.now();
  const timer = toolExecutionDuration.startTimer({ tool_name: 'get_security_schemes' });

  try {
    logger.info({ specId: args?.specId }, 'Obteniendo esquemas de seguridad OpenAPI');

    const securityInfo = await swaggerBreaker.execute(async () => {
      return getSecuritySchemes(args?.specId);
    });

    const responsePayload = {
      ...securityInfo,
      retrievedAt: new Date().toISOString()
    };

    const responseText = JSON.stringify(responsePayload, null, 2);
    const duration_ms = Date.now() - startTime;

    toolRequestsTotal.inc({ tool_name: 'get_security_schemes', status: 'success' });
    timer({ status: 'success' });

    recordActivity({
      tool_name: 'get_security_schemes',
      status: 'SUCCESS',
      duration_ms,
      tokens: estimateTokens(responseText),
      details: `Security Schemes query`
    });

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleToolError({
      toolName: 'get_security_schemes',
      error,
      startTime,
      timer,
      logMessage: 'Fallo al obtener esquemas de seguridad',
      prefix: 'Error al consultar esquemas de seguridad'
    });
  }
}

export async function validatePayloadHandler(args = {}) {
  const startTime = Date.now();
  const timer = toolExecutionDuration.startTimer({ tool_name: 'validate_payload' });

  try {
    logger.info({ schemaName: args?.schemaName, specId: args?.specId }, 'Validando payload contra schema OpenAPI');

    const validationResult = await swaggerBreaker.execute(async () => {
      return validatePayloadAgainstSchema({
        schemaName: args?.schemaName,
        payload: args?.payload,
        specId: args?.specId
      });
    });

    const responsePayload = {
      ...validationResult,
      timestamp: new Date().toISOString()
    };

    const responseText = JSON.stringify(responsePayload, null, 2);
    const duration_ms = Date.now() - startTime;

    toolRequestsTotal.inc({ tool_name: 'validate_payload', status: 'success' });
    timer({ status: 'success' });

    recordActivity({
      tool_name: 'validate_payload',
      status: validationResult.isValid ? 'SUCCESS' : 'FAILED',
      duration_ms,
      tokens: estimateTokens(responseText),
      details: `Payload validation for ${args?.schemaName}: ${validationResult.isValid ? 'VALID' : 'INVALID'}`
    });

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleToolError({
      toolName: 'validate_payload',
      error,
      startTime,
      timer,
      logMessage: 'Fallo al validar payload contra schema',
      prefix: 'Error en validación de payload'
    });
  }
}

export async function queryApiKnowledgeHandler(args = {}) {
  const startTime = Date.now();
  const timer = toolExecutionDuration.startTimer({ tool_name: 'query_api_knowledge' });

  try {
    logger.info({ query: args?.query, specId: args?.specId }, 'Consultando conocimiento global de APIs');

    const knowledge = await swaggerBreaker.execute(async () => {
      return queryApiKnowledge({
        query: args?.query,
        specId: args?.specId
      });
    });

    const responsePayload = {
      ...knowledge,
      timestamp: new Date().toISOString()
    };

    const responseText = JSON.stringify(responsePayload, null, 2);
    const duration_ms = Date.now() - startTime;

    toolRequestsTotal.inc({ tool_name: 'query_api_knowledge', status: 'success' });
    timer({ status: 'success' });

    recordActivity({
      tool_name: 'query_api_knowledge',
      status: 'SUCCESS',
      duration_ms,
      tokens: estimateTokens(responseText),
      details: `Knowledge Query: ${args?.query}`
    });

    return {
      content: [{ type: 'text', text: responseText }]
    };
  } catch (error) {
    return handleToolError({
      toolName: 'query_api_knowledge',
      error,
      startTime,
      timer,
      logMessage: 'Fallo al consultar conocimiento OpenAPI',
      prefix: 'Error en consulta de conocimiento'
    });
  }
}
