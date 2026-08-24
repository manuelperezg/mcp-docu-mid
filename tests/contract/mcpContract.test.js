import { describe, it, expect } from 'vitest';
import { tools } from '../../src/tools/index.js';
import { createMcpServer } from '../../src/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

describe('MCP Protocol Contract & Schema Validation', () => {
  it('all tools have valid JSON schemas and required properties', () => {
    expect(tools.length).toBeGreaterThan(0);

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

  it('MCP server handles ListToolsRequestSchema returning full tool catalogue', async () => {
    const srv = createMcpServer();
    const listHandler = srv._requestHandlers?.get(ListToolsRequestSchema.shape.method.value);

    expect(listHandler).toBeDefined();
    const response = await listHandler({ method: 'tools/list', params: {} });
    expect(response).toHaveProperty('tools');
    expect(response.tools.length).toBe(tools.length);
    expect(response.tools.map(t => t.name)).toContain('doc_search');
    expect(response.tools.map(t => t.name)).toContain('doc_fetch');
  });

  it('MCP server handles CallToolRequestSchema returning valid content structure', async () => {
    const srv = createMcpServer();
    const callHandler = srv._requestHandlers?.get(CallToolRequestSchema.shape.method.value);

    expect(callHandler).toBeDefined();

    const result = await callHandler({
      method: 'tools/call',
      params: {
        name: 'doc_search',
        arguments: { query: 'arquitectura' }
      }
    });

    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].type).toBe('text');
    expect(typeof result.content[0].text).toBe('string');
  });

  it('MCP server throws when calling an unknown tool', async () => {
    const srv = createMcpServer();
    const callHandler = srv._requestHandlers?.get(CallToolRequestSchema.shape.method.value);

    await expect(callHandler({
      method: 'tools/call',
      params: {
        name: 'unknown_tool',
        arguments: {}
      }
    })).rejects.toThrow('Tool no encontrada: unknown_tool');
  });
});
