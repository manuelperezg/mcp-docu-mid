import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadAllSwaggers,
  getLoadedSpecs,
  getSpec,
  searchDocs,
  getEndpointDoc,
  getSchemaDoc,
  getSecuritySchemes,
  validatePayloadAgainstSchema,
  queryApiKnowledge,
  getStoreStats,
  clearSwaggerCache,
  getCacheStats
} from '../../../src/utils/swaggerStore.js';
import { ValidationError, NotFoundError } from '../../../src/errors/index.js';

describe('Swagger Knowledge Store, Cache & O(1) Lookups', () => {
  beforeAll(async () => {
    // Primera carga para forzar generación de snapshots
    await loadAllSwaggers('swaggers', { force: true });
  });

  it('loads and dereferences OpenAPI files into memory using parallel cache snapshots', async () => {
    const stats = getStoreStats();
    expect(stats.specsCount).toBeGreaterThanOrEqual(3);
    expect(stats.endpointsCount).toBeGreaterThanOrEqual(140);
    expect(stats.schemasCount).toBeGreaterThanOrEqual(220);

    const specs = getLoadedSpecs();
    expect(specs.map(s => s.id)).toContain('loyalty-api');
    expect(specs.map(s => s.id)).toContain('flights-api');
    expect(specs.map(s => s.id)).toContain('middleware-internal');
  });

  it('subsequent loadAllSwaggers uses snapshot cache (cache hit)', async () => {
    const reloadResult = await loadAllSwaggers('swaggers');
    expect(reloadResult.cacheHits).toBeGreaterThan(0);
    expect(reloadResult.specsCount).toBeGreaterThanOrEqual(3);

    const cacheStats = getCacheStats();
    expect(cacheStats.hits).toBeGreaterThan(0);
  });

  it('clearSwaggerCache resets cache stats and removes files', () => {
    clearSwaggerCache();
    const stats = getCacheStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it('dereferences internal $ref pointers inside endpoints', () => {
    const endpoint = getEndpointDoc({ path: '/members/{memberId}', method: 'GET' });
    expect(endpoint).toBeDefined();
    expect(endpoint.method).toBe('GET');
    expect(endpoint.path).toBe('/members/{memberId}');

    // El parámetro debe estar dereferenciado (sin $ref)
    expect(endpoint.parameters[0].name).toBe('memberId');
    expect(endpoint.parameters[0].in).toBe('path');
    expect(endpoint.parameters[0].schema.type).toBe('string');

    // La respuesta 200 debe tener el schema completamente dereferenciado
    const schema200 = endpoint.responses['200'].content['application/json'].schema;
    expect(schema200).toHaveProperty('properties');
  });

  it('retrieves large spec endpoints with O(1) lookup', () => {
    const startTime = performance.now();
    const endpoint = getEndpointDoc({ path: '/v1/members/{memberId}/balances', method: 'GET' });
    const duration = performance.now() - startTime;

    expect(endpoint).toBeDefined();
    expect(endpoint.operationId).toBe('GetBalancesController_getBalances_v1');
    expect(duration).toBeLessThan(10);
  });

  it('getSpec returns raw spec by specId', () => {
    const spec = getSpec('loyalty-api');
    expect(spec).toBeDefined();
    expect(spec.title).toBe('Doters Loyalty API');
    expect(spec.version).toBe('2.4.0');

    expect(getSpec('non-existent')).toBeNull();
    expect(getSpec(null)).toBeNull();
  });

  it('getSecuritySchemes returns security definitions for all specs or a target spec', () => {
    const allSec = getSecuritySchemes();
    expect(allSec).toHaveProperty('schemesBySpec');
    expect(allSec.schemesBySpec.length).toBeGreaterThanOrEqual(3);

    const singleSec = getSecuritySchemes('middleware-internal');
    expect(singleSec.specId).toBe('middleware-internal');
    expect(singleSec).toHaveProperty('securitySchemes');
    expect(singleSec.securitySchemes).toHaveProperty('bearer');

    expect(() => getSecuritySchemes('non-existent-spec')).toThrow(NotFoundError);
  });

  it('validatePayloadAgainstSchema validates valid payload correctly', () => {
    const validPayload = {
      amountSpent: 1200.50,
      partnerId: 'VIVA-MX',
      referenceNumber: 'PNR-1234'
    };

    const result = validatePayloadAgainstSchema({ schemaName: 'AccrualRequest', payload: validPayload });
    expect(result.isValid).toBe(true);
    expect(result.errorsCount).toBe(0);
  });

  it('validatePayloadAgainstSchema catches missing fields and invalid types', () => {
    const invalidPayload = {
      amountSpent: 'invalid-string',
      partnerId: 'VIVA-MX'
    };

    const result = validatePayloadAgainstSchema({ schemaName: 'AccrualRequest', payload: invalidPayload });
    expect(result.isValid).toBe(false);
    expect(result.errorsCount).toBe(2);
  });

  it('searchDocs performs keyword search across endpoints and schemas', () => {
    const result = searchDocs({ query: 'balances' });
    expect(result.totalEndpointsFound).toBeGreaterThan(0);
    expect(result.endpoints.some(e => e.path.includes('balances'))).toBe(true);
  });

  it('searchDocs filters by tag and specId', () => {
    const tagResult = searchDocs({ query: 'member', tag: 'MemberApi' });
    expect(tagResult.endpoints.length).toBeGreaterThan(0);
    expect(tagResult.endpoints[0].tags).toContain('MemberApi');
  });

  it('getSchemaDoc retrieves fully dereferenced data model schema with O(1) lookup', () => {
    const schema = getSchemaDoc({ schemaName: 'MemberBalanceResponseDto' });
    expect(schema).toBeDefined();
    expect(schema.schemaName).toBe('MemberBalanceResponseDto');
    expect(schema.properties).toHaveProperty('balances');
  });

  it('getSchemaDoc throws NotFoundError when schema does not exist', () => {
    expect(() => getSchemaDoc({ schemaName: 'NonExistentSchema' })).toThrow(NotFoundError);
  });

  it('getEndpointDoc throws NotFoundError when endpoint does not exist', () => {
    expect(() => getEndpointDoc({ path: '/non/existent/route', method: 'DELETE' })).toThrow(NotFoundError);
  });

  it('queryApiKnowledge synthesizes API answers with context summary', () => {
    const knowledge = queryApiKnowledge({ query: 'balances' });
    expect(knowledge).toHaveProperty('contextSummary');
    expect(knowledge).toHaveProperty('relevantEndpoints');
    expect(knowledge.relevantEndpoints.length).toBeGreaterThan(0);
  });

  it('handles non-existent directories gracefully', async () => {
    const emptyResult = await loadAllSwaggers('non-existent-swaggers-dir');
    expect(emptyResult.specsCount).toBe(0);
  });
});
