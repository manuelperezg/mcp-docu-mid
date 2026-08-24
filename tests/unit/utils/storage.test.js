import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { saveStatsSync, loadStatsFromDisk, scheduleStatsSave, setupStorageLifecycle } from '../../../src/utils/storage.js';
import { getStats, recordActivity } from '../../../src/utils/metrics.js';

describe('Storage & Persistence Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('performs atomic synchronous write to disk', () => {
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation(() => {});
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    recordActivity({ tool_name: 'test', status: 'SUCCESS', duration_ms: 10 });
    saveStatsSync();

    expect(writeSpy).toHaveBeenCalled();
    expect(renameSpy).toHaveBeenCalled();
  });

  it('loads stats from disk if file exists', () => {
    const fakeData = JSON.stringify({ totalRequests: 42, totalTokens: 999 });
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(fakeData);

    loadStatsFromDisk();
    const stats = getStats();
    expect(stats.totalRequests).toBe(42);
    expect(stats.totalTokens).toBe(999);
  });

  it('schedules debounced save without crashing', () => {
    expect(() => scheduleStatsSave()).not.toThrow();
  });

  it('sets up storage lifecycle hooks', () => {
    expect(() => setupStorageLifecycle()).not.toThrow();
  });
});
