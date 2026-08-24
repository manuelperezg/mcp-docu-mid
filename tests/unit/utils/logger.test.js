import { describe, it, expect } from 'vitest';
import { logger } from '../../../src/utils/logger.js';

describe('Logger Utility', () => {
  it('is configured and provides logging methods without throwing', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');

    expect(() => {
      logger.info({ test: true }, 'Logger test execution');
    }).not.toThrow();
  });
});
