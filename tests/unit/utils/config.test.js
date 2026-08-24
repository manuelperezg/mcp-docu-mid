import { describe, it, expect } from 'vitest';
import { config } from '../../../src/utils/config.js';

describe('Config Utility', () => {
  it('loads configuration defaults cleanly', () => {
    expect(config).toBeDefined();
    expect(typeof config.transportMode).toBe('string');
    expect(typeof config.port).toBe('number');
    expect(typeof config.logLevel).toBe('string');
    expect(typeof config.mcpApiKey).toBe('string');
    expect(Array.isArray(config.allowedOrigins)).toBe(true);
    expect(typeof config.rateLimitMax).toBe('number');
  });
});
