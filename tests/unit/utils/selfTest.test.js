import { describe, it, expect, vi } from 'vitest';
import { runSelfTest } from '../../../src/utils/selfTest.js';
import * as swaggerStore from '../../../src/utils/swaggerStore.js';
import * as metrics from '../../../src/utils/metrics.js';
import { config } from '../../../src/utils/config.js';

describe('SelfTest Diagnostic Utility', () => {
  it('should run complete self-test and return healthy status', async () => {
    const result = await runSelfTest();

    expect(result.status).toBe('healthy');
    expect(result.server).toBe('mcp-doc-mid');
    expect(result.checks.config.status).toBe('pass');
    expect(result.checks.tools.status).toBe('pass');
    expect(result.checks.tools.count).toBe(8);
    expect(result.checks.metrics.status).toBe('pass');
    expect(result.checks.swaggers.status).toBe('pass');
    expect(result.checks.swaggers.specsCount).toBeGreaterThanOrEqual(1);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should report failure if Prometheus metrics fail to serialize', async () => {
    const metricsSpy = vi.spyOn(metrics.register, 'metrics').mockResolvedValueOnce('');

    const result = await runSelfTest();

    expect(result.status).toBe('unhealthy');
    expect(result.checks.metrics.status).toBe('fail');
    expect(result.checks.metrics.error).toContain('Prometheus');

    metricsSpy.mockRestore();
  });

  it('should report unhealthy if an unexpected exception occurs during self-test', async () => {
    const metricsSpy = vi.spyOn(metrics.register, 'metrics').mockRejectedValueOnce(new Error('Fatal Metrics Crash'));

    const result = await runSelfTest();

    expect(result.status).toBe('unhealthy');
    expect(result.error).toBe('Fatal Metrics Crash');

    metricsSpy.mockRestore();
  });

  it('should trigger swagger loading if initial store stats count is 0', async () => {
    let callCount = 0;
    const statsSpy = vi.spyOn(swaggerStore, 'getStoreStats').mockImplementation(() => {
      callCount++;
      return callCount === 1 
        ? { specsCount: 0, endpointsCount: 0, schemasCount: 0 }
        : { specsCount: 1, endpointsCount: 137, schemasCount: 221 };
    });
    const loadSpy = vi.spyOn(swaggerStore, 'loadAllSwaggers').mockResolvedValueOnce({});

    const result = await runSelfTest();

    expect(loadSpy).toHaveBeenCalled();
    expect(result.status).toBe('healthy');

    statsSpy.mockRestore();
    loadSpy.mockRestore();
  });
});
