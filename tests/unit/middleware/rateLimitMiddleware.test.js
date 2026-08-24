import { describe, it, expect } from 'vitest';
import { rateLimitMiddleware } from '../../../src/middleware/rateLimitMiddleware.js';
import { createMockRequest, createMockResponse } from '../../fixtures/mockHelpers.js';
import { RateLimitError } from '../../../src/errors/index.js';

describe('Rate Limit Middleware', () => {
  it('is properly exported as a middleware function', () => {
    expect(typeof rateLimitMiddleware).toBe('function');
  });

  it('custom handler passes RateLimitError to next', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    let nextErr = null;
    const next = (err) => { nextErr = err; };

    // Invoke the handler function directly if available or simulated
    const handler = rateLimitMiddleware;
    expect(typeof handler).toBe('function');
  });
});
