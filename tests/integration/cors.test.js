import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../src/server/sseServer.js';
import { createMcpServer } from '../../src/index.js';

describe('CORS Integration', () => {
  const app = createExpressApp(createMcpServer);

  it('handles OPTIONS preflight requests returning 204 with CORS headers', async () => {
    const res = await request(app)
      .options('/sse')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBe(204);
    expect(res.headers).toHaveProperty('access-control-allow-methods');
    expect(res.headers['access-control-allow-methods']).toContain('GET');
    expect(res.headers).toHaveProperty('access-control-allow-headers');
  });

  it('sets Access-Control-Allow-Origin on standard requests', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty('access-control-allow-origin');
  });
});
