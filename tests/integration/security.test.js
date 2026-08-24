import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../src/server/sseServer.js';
import { createMcpServer } from '../../src/index.js';
import { config } from '../../src/utils/config.js';

describe('Security & Session Binding Integration', () => {
  const app = createExpressApp(createMcpServer);

  it('POST /messages fails with 403 when session is not registered', async () => {
    const res = await request(app)
      .post('/messages?sessionId=unauthorized-session-id')
      .send({ jsonrpc: '2.0', method: 'ping', id: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
  });

  it('POST /messages fails with 403 when sessionId is completely missing', async () => {
    const res = await request(app)
      .post('/messages')
      .send({ jsonrpc: '2.0', method: 'ping', id: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ERROR');
  });

  it('GET /sse rejects unauthorized request without API key', async () => {
    const res = await request(app).get('/sse');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('includes Helmet security headers in responses', async () => {
    const res = await request(app).get('/health');
    expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(res.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
  });
});
