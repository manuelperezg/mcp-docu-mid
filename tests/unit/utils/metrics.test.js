import { describe, it, expect, beforeEach } from 'vitest';
import {
  register,
  recordActivity,
  getActivityLog,
  getStats,
  setStats,
  estimateTokens,
  resetMetricsForTests
} from '../../../src/utils/metrics.js';

describe('Metrics & Observability Utility', () => {
  beforeEach(() => {
    resetMetricsForTests();
  });

  it('calculates estimated tokens correctly', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('12345678')).toBe(2);
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens(null)).toBe(0);
  });

  it('records activity and updates cumulative statistics', () => {
    recordActivity({
      tool_name: 'doc_search',
      status: 'SUCCESS',
      duration_ms: 45,
      tokens: 120,
      details: 'Query test'
    });

    const logs = getActivityLog();
    expect(logs.length).toBe(1);
    expect(logs[0].tool_name).toBe('doc_search');
    expect(logs[0].status).toBe('SUCCESS');
    expect(logs[0].duration_ms).toBe(45);

    const stats = getStats();
    expect(stats.totalRequests).toBe(1);
    expect(stats.totalTokens).toBe(120);
    expect(stats.totalErrors).toBe(0);
    expect(stats.toolsUsage['doc_search']).toBe(1);
  });

  it('records error activity accurately', () => {
    recordActivity({
      tool_name: 'doc_fetch',
      status: 'FAILED',
      duration_ms: 15,
      tokens: 10,
      details: 'Not found'
    });

    const stats = getStats();
    expect(stats.totalRequests).toBe(1);
    expect(stats.totalErrors).toBe(1);
  });

  it('sets and merges loaded statistics', () => {
    setStats({
      totalTokens: 500,
      totalRequests: 10,
      totalErrors: 2,
      toolsUsage: { doc_search: 8, doc_fetch: 2 }
    });

    const stats = getStats();
    expect(stats.totalTokens).toBe(500);
    expect(stats.totalRequests).toBe(10);
    expect(stats.toolsUsage.doc_search).toBe(8);
  });

  it('provides Prometheus registry output', async () => {
    const metricsOutput = await register.metrics();
    expect(typeof metricsOutput).toBe('string');
    expect(metricsOutput).toContain('mcp_');
  });
});
