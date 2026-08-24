import { describe, it, expect, beforeEach } from 'vitest';
import { docSearchHandler, docFetchHandler } from '../../../src/tools/documentation/handler.js';
import { docSearchToolDefinition, docFetchToolDefinition } from '../../../src/tools/documentation/definition.js';
import { resetMetricsForTests } from '../../../src/utils/metrics.js';

describe('Documentation Tools (MCP-DOC-MID)', () => {
  beforeEach(() => {
    resetMetricsForTests();
  });

  describe('Definitions', () => {
    it('docSearchToolDefinition conforms to MCP schema', () => {
      expect(docSearchToolDefinition.name).toBe('doc_search');
      expect(docSearchToolDefinition.inputSchema.type).toBe('object');
      expect(docSearchToolDefinition.inputSchema.required).toContain('query');
    });

    it('docFetchToolDefinition conforms to MCP schema', () => {
      expect(docFetchToolDefinition.name).toBe('doc_fetch');
      expect(docFetchToolDefinition.inputSchema.type).toBe('object');
      expect(docFetchToolDefinition.inputSchema.required).toContain('documentId');
    });
  });

  describe('docSearchHandler', () => {
    it('returns search results matching query', async () => {
      const response = await docSearchHandler({ query: 'arquitectura' });
      expect(response.isError).toBeUndefined();
      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe('text');

      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.query).toBe('arquitectura');
      expect(parsed.totalFound).toBeGreaterThan(0);
      expect(parsed.results[0]).toHaveProperty('id');
      expect(parsed.results[0]).toHaveProperty('title');
    });

    it('filters by category when provided', async () => {
      const response = await docSearchHandler({ query: 'guía', category: 'deployment' });
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.category).toBe('deployment');
      expect(parsed.results.length).toBeGreaterThan(0);
      expect(parsed.results[0].category).toBe('deployment');
    });

    it('handles validation error when query is empty or invalid', async () => {
      const response = await docSearchHandler({ query: '   ' });
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error en servicio de documentación');
      expect(response.content[0].text).toContain('requerido');
    });
  });

  describe('docFetchHandler', () => {
    it('retrieves full document when valid documentId is provided', async () => {
      const response = await docFetchHandler({ documentId: 'arch-mcp-overview' });
      expect(response.isError).toBeUndefined();
      
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.document.id).toBe('arch-mcp-overview');
      expect(parsed.document.content).toContain('# Arquitectura Enterprise');
    });

    it('returns error when documentId is not found', async () => {
      const response = await docFetchHandler({ documentId: 'non-existent-doc' });
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error en servicio de documentación');
      expect(response.content[0].text).toContain('no encontrado');
    });

    it('returns validation error when documentId is missing', async () => {
      const response = await docFetchHandler({});
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Error en servicio de documentación');
      expect(response.content[0].text).toContain('requerido');
    });
  });
});
