import { describe, it, expect, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMcpServer, server, run } from '../../src/index.js';
import { config } from '../../src/utils/config.js';

describe('MCP Main Server Factory', () => {
  it('creates MCP server instance with valid configuration and capabilities', () => {
    const srv = createMcpServer();
    expect(srv).toBeDefined();
    expect(srv).toBeInstanceOf(Server);
  });

  it('exports default server instance', () => {
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(Server);
  });

  it('run() launches SSE server when transportMode is sse', async () => {
    const originalMode = config.transportMode;
    config.transportMode = 'sse';

    const httpSrv = await run();
    expect(httpSrv).toBeDefined();
    expect(typeof httpSrv.close).toBe('function');

    await new Promise((resolve) => httpSrv.close(resolve));
    config.transportMode = originalMode;
  });
});
