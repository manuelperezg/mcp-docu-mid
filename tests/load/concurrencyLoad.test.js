import { describe, it, expect } from 'vitest';
import { docSearchHandler, docFetchHandler } from '../../src/tools/documentation/handler.js';

describe('Concurrency & Load Test Suite', () => {
  it('handles 100+ concurrent tool invocations without memory leaks or degradation', async () => {
    const concurrentAgents = 100;
    const initialMemory = process.memoryUsage().heapUsed;

    const tasks = Array.from({ length: concurrentAgents }, (_, i) => {
      if (i % 2 === 0) {
        return docSearchHandler({ query: 'arquitectura', limit: 2 });
      } else {
        return docFetchHandler({ documentId: 'arch-mcp-overview' });
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

    // Latency should be reasonable (< 3000ms for 100 parallel calls) and memory growth bounded (< 50MB)
    expect(totalDuration).toBeLessThan(3000);
    expect(memoryDiffMb).toBeLessThan(50);
  });
});
