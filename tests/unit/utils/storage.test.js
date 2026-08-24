import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { saveStatsSync, loadStatsFromDisk, scheduleStatsSave, setupStorageLifecycle } from '../../../src/utils/storage.js';
import { getStats, setStats, recordActivity } from '../../../src/utils/metrics.js';
import { config } from '../../../src/utils/config.js';

describe('Storage & Persistence Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('performs atomic synchronous write to disk', () => {
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation(() => {});
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    recordActivity({ tool_name: 'test', status: 'SUCCESS', duration_ms: 10 });
    saveStatsSync();

    expect(writeSpy).toHaveBeenCalled();
    expect(renameSpy).toHaveBeenCalled();
  });

  it('creates directory if destination does not exist when saving', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    vi.spyOn(fs, 'renameSync').mockImplementation(() => {});

    saveStatsSync();

    expect(mkdirSpy).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  it('handles write failure gracefully without throwing', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('EACCES: Permission denied');
    });

    expect(() => saveStatsSync()).not.toThrow();
  });

  it('loads stats from disk if file exists and is valid JSON', () => {
    const fakeData = JSON.stringify({ totalRequests: 42, totalTokens: 999 });
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(fakeData);

    loadStatsFromDisk();
    const stats = getStats();
    expect(stats.totalRequests).toBe(42);
    expect(stats.totalTokens).toBe(999);
  });

  it('handles corrupted JSON on disk gracefully without crashing', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('INVALID_CORRUPT_JSON{{{');

    expect(() => loadStatsFromDisk()).not.toThrow();
  });

  it('bypasses loading and saving if statsStorageEnabled is false', () => {
    const originalSetting = config.statsStorageEnabled;
    config.statsStorageEnabled = false;

    const readSpy = vi.spyOn(fs, 'readFileSync');
    const writeSpy = vi.spyOn(fs, 'writeFileSync');

    loadStatsFromDisk();
    saveStatsSync();
    scheduleStatsSave();

    expect(readSpy).not.toHaveBeenCalled();
    expect(writeSpy).not.toHaveBeenCalled();

    config.statsStorageEnabled = originalSetting;
  });

  it('schedules debounced save without crashing', () => {
    expect(() => scheduleStatsSave()).not.toThrow();
  });

  it('sets up storage lifecycle hooks and registers process exit listeners', () => {
    const processOnceSpy = vi.spyOn(process, 'once');
    setupStorageLifecycle();

    expect(processOnceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(processOnceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(processOnceSpy).toHaveBeenCalledWith('beforeExit', expect.any(Function));
  });
});
