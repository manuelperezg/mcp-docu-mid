import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../src/server/sseServer.js';
import { createMcpServer } from '../../src/index.js';
import { config } from '../../src/utils/config.js';

describe('SSE Server & HTTP Integration', () => {
  const app = createExpressApp(createMcpServer);

  it('GET /health returns 200 with status ok and uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /health/ready returns 200 with server info', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.server).toBe('mcp-doc-mid');
  });

  it('GET /health/diagnostic returns 200 with stats and activity', async () => {
    const res = await request(app).get('/health/diagnostic');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('stats');
    expect(res.body).toHaveProperty('activity');
  });

  it('GET /metrics returns Prometheus formatted metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('mcp_');
  });

  it('GET /dashboard is protected and accessible with Basic Auth', async () => {
    const unauthRes = await request(app).get('/dashboard');
    expect(unauthRes.status).toBe(401);

    const token = Buffer.from(`${config.dashboardUser}:${config.dashboardPassword}`).toString('base64');
    const authRes = await request(app)
      .get('/dashboard')
      .set('Authorization', `Basic ${token}`);
    
    expect(authRes.status).toBe(200);
    expect(authRes.text).toContain('MCP-DOC-MID');
  });
});
