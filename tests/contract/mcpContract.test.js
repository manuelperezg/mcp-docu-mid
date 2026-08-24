import { describe, it, expect, beforeAll } from 'vitest';
import { tools } from '../../src/tools/index.js';
import { createMcpServer } from '../../src/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadAllSwaggers } from '../../src/utils/swaggerStore.js';

describe('MCP Protocol Contract & Schema Validation', () => {
  beforeAll(async () => {
    await loadAllSwaggers('swaggers');
  });

  it('all 8 tools have valid JSON schemas and required properties', () => {
    expect(tools.length).toBe(8);

    for (const tool of tools) {
      const def = tool.definition;
      expect(def).toHaveProperty('name');
      expect(typeof def.name).toBe('string');
      expect(def.name.length).toBeGreaterThan(0);

      expect(def).toHaveProperty('description');
      expect(typeof def.description).toBe('string');

      expect(def).toHaveProperty('inputSchema');
      expect(def.inputSchema.type).toBe('object');
      expect(def.inputSchema).toHaveProperty('properties');
      expect(typeof def.inputSchema.properties).toBe('object');

      expect(typeof tool.handler).toBe('function');
    }
  });

  it('MCP server handles ListToolsRequestSchema returning all 8 tools', async () => {
    const srv = createMcpServer();
    const listHandler = srv._requestHandlers?.get(ListToolsRequestSchema.shape.method.value);

    expect(listHandler).toBeDefined();
    const response = await listHandler({ method: 'tools/list', params: {} });
    expect(response).toHaveProperty('tools');
    expect(response.tools.length).toBe(8);
    const toolNames = response.tools.map(t => t.name);
    expect(toolNames).toContain('list_specs');
    expect(toolNames).toContain('search_docs');
    expect(toolNames).toContain('get_endpoint_doc');
    expect(toolNames).toContain('get_schema_doc');
    expect(toolNames).toContain('generate_integration_code');
    expect(toolNames).toContain('get_security_schemes');
    expect(toolNames).toContain('validate_payload');
    expect(toolNames).toContain('query_api_knowledge');
  });

  it('MCP server handles CallToolRequestSchema for generate_integration_code', async () => {
    const srv = createMcpServer();
    const callHandler = srv._requestHandlers?.get(CallToolRequestSchema.shape.method.value);

    expect(callHandler).toBeDefined();

    const result = await callHandler({
      method: 'tools/call',
      params: {
        name: 'generate_integration_code',
        arguments: {
          path: '/v1/members/{memberId}/balances',
          method: 'GET',
          language: 'typescript'
        }
      }
    });

    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('export async function GetBalancesController_getBalances_v1(');
  });

  it('MCP server throws when calling an unknown tool', async () => {
    const srv = createMcpServer();
    const callHandler = srv._requestHandlers?.get(CallToolRequestSchema.shape.method.value);

    await expect(callHandler({
      method: 'tools/call',
      params: {
        name: 'unknown_swagger_tool',
        arguments: {}
      }
    })).rejects.toThrow('Tool no encontrada: unknown_swagger_tool');
  });
});
