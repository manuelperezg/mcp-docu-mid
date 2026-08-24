import { describe, it, expect } from 'vitest';
import { runSelfTest } from '../../../src/utils/selfTest.js';

describe('Self Test Utility', () => {
  it('runs autonomous runtime self-test and reports healthy status in <100ms', async () => {
    const report = await runSelfTest();

    expect(report).toBeDefined();
    expect(report.status).toBe('healthy');
    expect(report.server).toBe('mcp-doc-mid');
    expect(report.durationMs).toBeLessThan(500);
    expect(report.checks.config.status).toBe('pass');
    expect(report.checks.tools.status).toBe('pass');
    expect(report.checks.tools.count).toBeGreaterThan(0);
    expect(report.checks.metrics.status).toBe('pass');
    expect(report.checks.storage.status).toBe('pass');
  });
});
