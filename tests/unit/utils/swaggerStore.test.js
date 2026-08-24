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
  getStoreStats
} from '../../../src/utils/swaggerStore.js';
import { ValidationError, NotFoundError } from '../../../src/errors/index.js';

describe('Swagger Knowledge Store & Dereferencer', () => {
  beforeAll(async () => {
    await loadAllSwaggers('swaggers');
  });

  it('loads and dereferences OpenAPI files (.yml and .json) into memory', () => {
    const stats = getStoreStats();
    expect(stats.specsCount).toBeGreaterThanOrEqual(2);
    expect(stats.endpointsCount).toBeGreaterThanOrEqual(3);
    expect(stats.schemasCount).toBeGreaterThanOrEqual(5);

    const specs = getLoadedSpecs();
    expect(specs.map(s => s.id)).toContain('loyalty-api');
    expect(specs.map(s => s.id)).toContain('flights-api');
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
    expect(schema200.properties).toHaveProperty('tier');
    // TierLevel enum debe estar dereferenciado en línea
    expect(schema200.properties.tier).toHaveProperty('enum');
    expect(schema200.properties.tier.enum).toContain('Platinum');
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
    expect(allSec.schemesBySpec.length).toBeGreaterThanOrEqual(2);

    const singleSec = getSecuritySchemes('loyalty-api');
    expect(singleSec.specId).toBe('loyalty-api');
    expect(singleSec).toHaveProperty('securitySchemes');

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
      // referenceNumber is missing
    };

    const result = validatePayloadAgainstSchema({ schemaName: 'AccrualRequest', payload: invalidPayload });
    expect(result.isValid).toBe(false);
    expect(result.errorsCount).toBe(2);
    expect(result.errors.some(e => e.includes('referenceNumber'))).toBe(true);
    expect(result.errors.some(e => e.includes('amountSpent'))).toBe(true);
  });

  it('validatePayloadAgainstSchema throws ValidationError for invalid arguments', () => {
    expect(() => validatePayloadAgainstSchema({ schemaName: 'AccrualRequest', payload: 'not-an-object' })).toThrow(ValidationError);
  });

  it('searchDocs performs keyword search across endpoints and schemas', () => {
    const result = searchDocs({ query: 'points' });
    expect(result.totalEndpointsFound).toBeGreaterThan(0);
    expect(result.endpoints.some(e => e.path.includes('points'))).toBe(true);

    const flightResult = searchDocs({ query: 'flight', limit: 5 });
    expect(flightResult.endpoints.length).toBeGreaterThan(0);
  });

  it('searchDocs filters by tag and specId', () => {
    const tagResult = searchDocs({ query: 'member', tag: 'Members' });
    expect(tagResult.endpoints.length).toBeGreaterThan(0);
    expect(tagResult.endpoints[0].tags).toContain('Members');

    const specResult = searchDocs({ query: 'search', specId: 'flights-api' });
    expect(specResult.endpoints.length).toBeGreaterThan(0);
    expect(specResult.endpoints[0].specId).toBe('flights-api');
  });

  it('searchDocs throws ValidationError when query is empty', () => {
    expect(() => searchDocs({ query: '' })).toThrow(ValidationError);
  });

  it('getSchemaDoc retrieves fully dereferenced data model schema', () => {
    const schema = getSchemaDoc({ schemaName: 'MemberProfile' });
    expect(schema).toBeDefined();
    expect(schema.schemaName).toBe('MemberProfile');
    expect(schema.required).toContain('memberId');
    expect(schema.properties).toHaveProperty('pointsBalance');
  });

  it('getSchemaDoc throws NotFoundError when schema does not exist', () => {
    expect(() => getSchemaDoc({ schemaName: 'NonExistentSchema' })).toThrow(NotFoundError);
  });

  it('getEndpointDoc throws NotFoundError when endpoint does not exist', () => {
    expect(() => getEndpointDoc({ path: '/non/existent/route', method: 'DELETE' })).toThrow(NotFoundError);
  });

  it('queryApiKnowledge synthesizes API answers with context summary', () => {
    const knowledge = queryApiKnowledge({ query: 'acumulación de puntos' });
    expect(knowledge).toHaveProperty('contextSummary');
    expect(knowledge).toHaveProperty('relevantEndpoints');
    expect(knowledge.relevantEndpoints.length).toBeGreaterThan(0);
    expect(knowledge).toHaveProperty('synthesizedOverview');
  });

  it('handles non-existent directories gracefully', async () => {
    const emptyResult = await loadAllSwaggers('non-existent-swaggers-dir');
    expect(emptyResult.specsCount).toBe(0);
  });
});
