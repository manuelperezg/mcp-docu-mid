import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerAuthenticatedSession,
  validateSession,
  unregisterSession,
  getActiveSessionCount,
  resetSessionsForTests,
  sessionBindingMiddleware,
  apiAuthMiddleware,
  dashboardAuthMiddleware
} from '../../../src/middleware/authMiddleware.js';
import { config } from '../../../src/utils/config.js';
import { createMockRequest, createMockResponse } from '../../fixtures/mockHelpers.js';
import { ForbiddenError, AuthenticationError } from '../../../src/errors/index.js';

describe('Auth Middleware & Session Binding', () => {
  beforeEach(() => {
    resetSessionsForTests();
  });

  describe('Session Binding Management', () => {
    it('registers, validates and unregisters sessions', () => {
      expect(getActiveSessionCount()).toBe(0);
      registerAuthenticatedSession('session-123', { user: 'test' });
      expect(getActiveSessionCount()).toBe(1);
      expect(validateSession('session-123')).toBe(true);
      expect(validateSession('non-existent')).toBe(false);
      expect(validateSession(null)).toBe(false);

      unregisterSession('session-123');
      expect(getActiveSessionCount()).toBe(0);
      expect(validateSession('session-123')).toBe(false);
    });

    it('sessionBindingMiddleware accepts valid registered session', () => {
      registerAuthenticatedSession('session-abc');
      const req = createMockRequest({ query: { sessionId: 'session-abc' } });
      const res = createMockResponse();
      const next = vi.fn();

      sessionBindingMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.sessionId).toBe('session-abc');
    });

    it('sessionBindingMiddleware rejects missing sessionId', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      sessionBindingMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('sessionBindingMiddleware rejects unregistered sessionId (Session Hijacking prevention)', () => {
      const req = createMockRequest({ query: { sessionId: 'hijacked-id' } });
      const res = createMockResponse();
      const next = vi.fn();

      sessionBindingMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('API Key and Bearer Token Auth', () => {
    it('passes when valid x-api-key header is provided', () => {
      const req = createMockRequest({ headers: { 'x-api-key': config.mcpApiKey } });
      const res = createMockResponse();
      const next = vi.fn();

      apiAuthMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('passes when valid Bearer authorization header is provided', () => {
      const req = createMockRequest({ headers: { authorization: `Bearer ${config.mcpApiKey}` } });
      const res = createMockResponse();
      const next = vi.fn();

      apiAuthMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('rejects invalid or missing auth credentials', () => {
      const req = createMockRequest({ headers: { authorization: 'Bearer invalid-token' } });
      const res = createMockResponse();
      const next = vi.fn();

      apiAuthMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('Dashboard Basic Auth', () => {
    it('accepts correct basic auth credentials', () => {
      const token = Buffer.from(`${config.dashboardUser}:${config.dashboardPassword}`).toString('base64');
      const req = createMockRequest({ headers: { authorization: `Basic ${token}` } });
      const res = createMockResponse();
      const next = vi.fn();

      dashboardAuthMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('rejects incorrect basic auth credentials with 401', () => {
      const token = Buffer.from('wrong:creds').toString('base64');
      const req = createMockRequest({ headers: { authorization: `Basic ${token}` } });
      const res = createMockResponse();
      const next = vi.fn();

      dashboardAuthMiddleware(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(res.headers['www-authenticate']).toContain('Basic');
    });
  });
});
