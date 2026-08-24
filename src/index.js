import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools/index.js';
import { startSseServer } from './server/sseServer.js';
import { logger } from './utils/logger.js';
import { runSelfTest } from './utils/selfTest.js';
import { config } from './utils/config.js';
import { setupStorageLifecycle } from './utils/storage.js';

export function createMcpServer() {
  const mcpServer = new Server(
    { name: 'mcp-doc-mid', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(t => t.definition)
  }));

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = tools.find(t => t.definition.name === toolName);

    if (!tool) {
      throw new Error(`Tool no encontrada: ${toolName}`);
    }

    return await tool.handler(request.params.arguments || {});
  });

  return mcpServer;
}

export const server = createMcpServer();

export async function run() {
  setupStorageLifecycle();

  if (process.argv.includes('--self-test')) {
    const report = await runSelfTest();
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    process.exit(report.status === 'healthy' ? 0 : 1);
  }

  if (config.transportMode === 'sse' || config.transportMode === 'http') {
    return startSseServer(createMcpServer, config.port);
  } else {
    logger.info('Iniciando servidor MCP en modo STDIO');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return server;
  }
}

if (process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('index.mjs'))) {
  run().catch((error) => {
    logger.error({ error: error.message }, 'Error fatal en el servidor MCP');
    process.exit(1);
  });
}
