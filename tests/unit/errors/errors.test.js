import { describe, it, expect, vi } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
  CircuitBreakerOpenError,
  normalizeError,
  handleToolError,
  expressErrorHandler
} from '../../../src/errors/index.js';
import { createMockRequest, createMockResponse } from '../../fixtures/mockHelpers.js';

describe('Error Hierarchy & Error Handling', () => {
  it('AppError serializes correctly to MCP and JSON', () => {
    const error = new AppError('Something went wrong', { code: 'CUSTOM_ERR', statusCode: 500, details: { foo: 'bar' } });
    
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('CUSTOM_ERR');
    expect(error.statusCode).toBe(500);

    const mcpRes = error.toMcpResponse();
    expect(mcpRes.isError).toBe(true);
    expect(mcpRes.content[0].text).toContain('[CUSTOM_ERR] Something went wrong');

    const jsonRes = error.toJson();
    expect(jsonRes.error.code).toBe('CUSTOM_ERR');
    expect(jsonRes.error.details.foo).toBe('bar');
  });

  it('ValidationError has statusCode 400 and code VALIDATION_ERROR', () => {
    const err = new ValidationError('Missing field', { field: 'name' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details.field).toBe('name');
  });

  it('AuthenticationError has statusCode 401', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
  });

  it('ForbiddenError has statusCode 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN_ERROR');
  });

  it('NotFoundError has statusCode 404', () => {
    const err = new NotFoundError('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND_ERROR');
  });

  it('RateLimitError has statusCode 429', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('ExternalServiceError has statusCode 502 and records service name', () => {
    const err = new ExternalServiceError('GitHub', 'Timeout connecting', { timeout: 5000 });
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(err.serviceName).toBe('GitHub');
    expect(err.message).toContain('[GitHub]');
  });

  it('CircuitBreakerOpenError has statusCode 503', () => {
    const err = new CircuitBreakerOpenError('SearchAPI', 30000);
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe('CIRCUIT_BREAKER_OPEN');
    expect(err.cooldownMs).toBe(30000);
  });

  it('normalizeError wraps non-AppError into AppError', () => {
    const rawError = new Error('Raw error');
    const normalized = normalizeError(rawError);
    expect(normalized).toBeInstanceOf(AppError);
    expect(normalized.statusCode).toBe(500);
    expect(normalized.code).toBe('INTERNAL_ERROR');

    const appErr = new ValidationError('already an app error');
    expect(normalizeError(appErr)).toBe(appErr);

    const stringErr = normalizeError('string failure');
    expect(stringErr.message).toBe('string failure');
  });

  it('handleToolError formats response and records metrics', () => {
    const timerMock = vi.fn();
    const result = handleToolError({
      toolName: 'test_tool',
      error: new ValidationError('Bad query'),
      startTime: Date.now() - 100,
      timer: timerMock,
      prefix: 'Tool Error'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Tool Error: Bad query');
    expect(timerMock).toHaveBeenCalledWith({ status: 'error' });
  });

  it('expressErrorHandler sends JSON response with appropriate status code', () => {
    const req = createMockRequest({ path: '/api/test' });
    const res = createMockResponse();
    const next = vi.fn();

    const err = new ValidationError('Invalid input');
    expressErrorHandler(err, req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(next).not.toHaveBeenCalled();
  });

  it('expressErrorHandler delegates to next if headers are already sent', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    res.headersSent = true;
    const next = vi.fn();

    expressErrorHandler(new Error('late error'), req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
