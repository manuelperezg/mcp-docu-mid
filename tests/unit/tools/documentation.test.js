import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  listSpecsHandler,
  searchDocsHandler,
  getEndpointDocHandler,
  getSchemaDocHandler,
  generateIntegrationCodeHandler,
  getSecuritySchemesHandler,
  validatePayloadHandler,
  queryApiKnowledgeHandler
} from '../../../src/tools/documentation/handler.js';
import {
  listSpecsToolDefinition,
  searchDocsToolDefinition,
  getEndpointDocToolDefinition,
  getSchemaDocToolDefinition,
  generateIntegrationCodeToolDefinition,
  getSecuritySchemesToolDefinition,
  validatePayloadToolDefinition,
  queryApiKnowledgeToolDefinition
} from '../../../src/tools/documentation/definition.js';
import { resetMetricsForTests } from '../../../src/utils/metrics.js';
import { loadAllSwaggers } from '../../../src/utils/swaggerStore.js';

describe('Swagger Documentation & Code Generation MCP Tools', () => {
  beforeAll(async () => {
    await loadAllSwaggers('swaggers');
  });

  beforeEach(() => {
    resetMetricsForTests();
  });

  describe('Tool Definitions', () => {
    it('all 8 tool definitions follow valid JSON Schema', () => {
      const defs = [
        listSpecsToolDefinition,
        searchDocsToolDefinition,
        getEndpointDocToolDefinition,
        getSchemaDocToolDefinition,
        generateIntegrationCodeToolDefinition,
        getSecuritySchemesToolDefinition,
        validatePayloadToolDefinition,
        queryApiKnowledgeToolDefinition
      ];

      expect(defs.length).toBe(8);
      for (const def of defs) {
        expect(def).toHaveProperty('name');
        expect(def).toHaveProperty('description');
        expect(def).toHaveProperty('inputSchema');
        expect(def.inputSchema.type).toBe('object');
      }
    });
  });

  describe('listSpecsHandler', () => {
    it('returns list of loaded and dereferenced OpenAPI specs', async () => {
      const response = await listSpecsHandler({});
      expect(response.isError).toBeUndefined();
      expect(response.content[0].type).toBe('text');

      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.totalSpecs).toBeGreaterThanOrEqual(1);
      expect(parsed.specs[0]).toHaveProperty('title');
      expect(parsed.specs[0]).toHaveProperty('pathsCount');
    });
  });

  describe('searchDocsHandler', () => {
    it('searches across endpoints and schemas', async () => {
      const response = await searchDocsHandler({ query: 'balances' });
      expect(response.isError).toBeUndefined();

      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.query).toBe('balances');
      expect(parsed.totalEndpointsFound).toBeGreaterThan(0);
    });

    it('returns error when query parameter is missing', async () => {
      const response = await searchDocsHandler({});
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error en búsqueda documental');
    });
  });

  describe('getEndpointDocHandler', () => {
    it('retrieves detailed dereferenced endpoint specification', async () => {
      const response = await getEndpointDocHandler({ path: '/v1/members/{memberId}/balances', method: 'GET' });
      expect(response.isError).toBeUndefined();

      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.endpoint.method).toBe('GET');
      expect(parsed.endpoint.path).toBe('/v1/members/{memberId}/balances');
      expect(parsed.endpoint.parameters[0].name).toBe('memberId');
    });

    it('returns error when path is not found', async () => {
      const response = await getEndpointDocHandler({ path: '/invalid/path' });
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error al consultar endpoint');
    });
  });

  describe('getSchemaDocHandler', () => {
    it('retrieves detailed dereferenced schema model', async () => {
      const response = await getSchemaDocHandler({ schemaName: 'LoginRequestDto' });
      expect(response.isError).toBeUndefined();

      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.schema.schemaName).toBe('LoginRequestDto');
      expect(parsed.schema.properties).toHaveProperty('email');
    });

    it('returns error when schemaName is missing', async () => {
      const response = await getSchemaDocHandler({});
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error al consultar schema');
    });
  });

  describe('generateIntegrationCodeHandler', () => {
    it('generates TypeScript integration snippet', async () => {
      const response = await generateIntegrationCodeHandler({
        path: '/v1/members/{memberId}/balances',
        method: 'GET',
        language: 'typescript'
      });

      expect(response.isError).toBeUndefined();
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.language).toBe('typescript');
      expect(parsed.generatedCode).toContain('export async function GetBalancesController_getBalances_v1(');
    });

    it('generates Python integration snippet', async () => {
      const response = await generateIntegrationCodeHandler({
        path: '/v1/security/login',
        method: 'POST',
        language: 'python'
      });

      expect(response.isError).toBeUndefined();
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.language).toBe('python');
      expect(parsed.generatedCode).toContain('import httpx');
      expect(parsed.generatedCode).toContain('async def login_controller_do_login_v1(');
    });

    it('returns error when endpoint does not exist', async () => {
      const response = await generateIntegrationCodeHandler({
        path: '/non/existent/route'
      });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error en generador de código');
    });
  });

  describe('getSecuritySchemesHandler', () => {
    it('retrieves security schemes from specs', async () => {
      const response = await getSecuritySchemesHandler({});
      expect(response.isError).toBeUndefined();

      const parsed = JSON.parse(response.content[0].text);
      expect(parsed).toHaveProperty('schemesBySpec');
    });

    it('returns error when specId is invalid', async () => {
      const response = await getSecuritySchemesHandler({ specId: 'non-existent-spec' });
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error al consultar esquemas de seguridad');
    });
  });

  describe('validatePayloadHandler', () => {
    it('validates correct payload successfully', async () => {
      const response = await validatePayloadHandler({
        schemaName: 'LoginRequestDto',
        payload: {
          email: 'user@example.com',
          password: 'securePassword123'
        }
      });

      expect(response.isError).toBeUndefined();
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.isValid).toBe(true);
    });

    it('returns validation errors for missing required fields', async () => {
      const response = await validatePayloadHandler({
        schemaName: 'LoginRequestDto',
        payload: {
          email: 'user@example.com'
        }
      });

      expect(response.isError).toBeUndefined();
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.isValid).toBe(false);
      expect(parsed.errors.length).toBeGreaterThan(0);
    });

    it('returns error when schemaName is missing', async () => {
      const response = await validatePayloadHandler({});
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error en validación de payload');
    });
  });

  describe('queryApiKnowledgeHandler', () => {
    it('synthesizes API knowledge to answer technical/business questions', async () => {
      const response = await queryApiKnowledgeHandler({ query: 'balances' });
      expect(response.isError).toBeUndefined();

      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.query).toBe('balances');
      expect(parsed).toHaveProperty('contextSummary');
      expect(parsed).toHaveProperty('relevantEndpoints');
    });

    it('returns error when query is missing', async () => {
      const response = await queryApiKnowledgeHandler({});
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error en consulta de conocimiento');
    });
  });
});
