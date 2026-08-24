import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createExpressApp, startSseServer } from '../../src/server/sseServer.js';
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

  it('OPTIONS request returns 204 with CORS headers', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
  });

  it('starts SSE server instance and listens on ephemeral port', async () => {
    const testPort = 0;
    const server = startSseServer(createMcpServer, testPort);

    expect(server).toBeDefined();
    expect(server.listening).toBe(true);

    await new Promise((resolve) => server.close(resolve));
  });
});
