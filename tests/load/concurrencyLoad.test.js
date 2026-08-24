import { describe, it, expect, beforeAll } from 'vitest';
import {
  searchDocsHandler,
  getEndpointDocHandler,
  getSchemaDocHandler,
  generateIntegrationCodeHandler,
  validatePayloadHandler,
  queryApiKnowledgeHandler
} from '../../src/tools/documentation/handler.js';
import { loadAllSwaggers } from '../../src/utils/swaggerStore.js';

describe('Concurrency & Load Test Suite (Swagger Knowledge & Code Gen)', () => {
  beforeAll(async () => {
    await loadAllSwaggers('swaggers');
  });

  it('handles 100+ concurrent OpenAPI & Code Gen tool invocations without memory leaks', async () => {
    const concurrentAgents = 100;
    const initialMemory = process.memoryUsage().heapUsed;

    const tasks = Array.from({ length: concurrentAgents }, (_, i) => {
      const mod = i % 5;
      if (mod === 0) {
        return searchDocsHandler({ query: 'balances', limit: 2 });
      } else if (mod === 1) {
        return getEndpointDocHandler({ path: '/v1/members/{memberId}/balances', method: 'GET' });
      } else if (mod === 2) {
        return generateIntegrationCodeHandler({ path: '/v1/security/login', method: 'POST', language: 'python' });
      } else if (mod === 3) {
        return validatePayloadHandler({
          schemaName: 'LoginRequestDto',
          payload: { email: 'test@example.com', password: 'securePassword123' }
        });
      } else {
        return queryApiKnowledgeHandler({ query: 'cómo consultar balances de socios' });
      }
    });

    const startTime = Date.now();
    const results = await Promise.all(tasks);
    const totalDuration = Date.now() - startTime;

    expect(results.length).toBe(concurrentAgents);
    for (const res of results) {
      expect(res.isError).toBeUndefined();
      expect(res.content).toBeDefined();
      expect(res.content[0].type).toBe('text');
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDiffMb = (finalMemory - initialMemory) / (1024 * 1024);

    expect(totalDuration).toBeLessThan(3000);
    expect(memoryDiffMb).toBeLessThan(50);
  });
});
