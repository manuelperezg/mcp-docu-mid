import { toolExecutionDuration, toolRequestsTotal, recordActivity, estimateTokens } from '../../utils/metrics.js';
import { handleToolError, ValidationError, NotFoundError } from '../../errors/index.js';
import { logger } from '../../utils/logger.js';
import { CircuitBreaker, executeWithRetry } from '../../utils/resilience.js';

const docServiceBreaker = new CircuitBreaker({
  name: 'doc_service',
  failureThreshold: 4,
  cooldownMs: 15000
});

// Catálogo base de documentación para MCP-DOC-MID
const SAMPLE_DOCS = [
  {
    id: 'arch-mcp-overview',
    title: 'Arquitectura Enterprise de Servidores MCP',
    category: 'architecture',
    tags: ['mcp', 'node', 'sse', 'stdio', 'security'],
    summary: 'Guía sobre la arquitectura dual (STDIO/SSE), Session Binding y observabilidad.',
    content: `# Arquitectura Enterprise de Servidores MCP\n\nEste documento describe los estándares de resiliencia, métricas y transporte dual (STDIO/SSE) para servidores MCP corporativos.\n\n- Transporte STDIO para CLI local\n- Transporte SSE/Express para despliegue distribuido\n- Session Binding para seguridad contra Session Hijacking\n- Cobertura de pruebas >=85%`
  },
  {
    id: 'api-error-hierarchy',
    title: 'Jerarquía de Errores y Manejo Resiliente',
    category: 'api',
    tags: ['errors', 'apperror', 'resilience'],
    summary: 'Especificación de clases AppError y serialización dual JSON-RPC / HTTP.',
    content: `# Jerarquía de Errores\n\nTodos los errores derivan de AppError implementando .toMcpResponse() y .toJson().\n\n- ValidationError (400)\n- AuthenticationError (401)\n- ForbiddenError (403)\n- NotFoundError (404)\n- RateLimitError (429)\n- ExternalServiceError (502)\n- CircuitBreakerOpenError (503)`
  },
  {
    id: 'deployment-docker-guide',
    title: 'Guía de Despliegue con Docker y Kubernetes',
    category: 'deployment',
    tags: ['docker', 'deployment', 'kubernetes'],
    summary: 'Instrucciones para empaquetar el servidor MCP con Docker multi-stage.',
    content: `# Guía de Despliegue Docker\n\nUtiliza imagen Node.js Alpine en multi-stage.\n\n\`\`\`bash\ndocker build -t mcp-doc-mid:latest .\ndocker run -p 3000:3000 -e TRANSPORT_MODE=sse mcp-doc-mid:latest\n\`\`\``
  }
];

export async function docSearchHandler(args) {
  const startTime = Date.now();
  const timer = toolExecutionDuration.startTimer({ tool_name: 'doc_search' });

  try {
    if (!args || typeof args.query !== 'string' || !args.query.trim()) {
      throw new ValidationError('El parámetro "query" es requerido y debe ser una cadena de texto no vacía.', { field: 'query' });
    }

    const query = args.query.toLowerCase().trim();
    const category = args.category ? String(args.category).toLowerCase().trim() : null;
    const limit = Math.min(Math.max(parseInt(args.limit || '5', 10), 1), 20);

    logger.info({ query, category, limit }, 'Ejecutando búsqueda documental en doc_search');

    const results = await docServiceBreaker.execute(async () => {
      return executeWithRetry(async () => {
        let filtered = SAMPLE_DOCS;
        if (category) {
          filtered = filtered.filter(d => d.category.toLowerCase() === category);
        }

        const matched = filtered.filter(doc => {
          const matchTitle = doc.title.toLowerCase().includes(query);
          const matchSummary = doc.summary.toLowerCase().includes(query);
          const matchTags = doc.tags.some(t => t.toLowerCase().includes(query));
          const matchContent = doc.content.toLowerCase().includes(query);
          return matchTitle || matchSummary || matchTags || matchContent;
        });

        return matched.slice(0, limit).map(doc => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          tags: doc.tags,
          summary: doc.summary
        }));
      });
    });

    const responsePayload = {
      query: args.query,
      category: category || 'all',
      totalFound: results.length,
      results,
      timestamp: new Date().toISOString()
    };

    const responseText = JSON.stringify(responsePayload, null, 2);
    const duration_ms = Date.now() - startTime;

    toolRequestsTotal.inc({ tool_name: 'doc_search', status: 'success' });
    timer({ status: 'success' });

    recordActivity({
      tool_name: 'doc_search',
      status: 'SUCCESS',
      duration_ms,
      tokens: estimateTokens(responseText),
      details: `Query: ${query} (encontrados: ${results.length})`
    });

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  } catch (error) {
    return handleToolError({
      toolName: 'doc_search',
      error,
      startTime,
      timer,
      logMessage: 'Fallo al ejecutar búsqueda en doc_search',
      prefix: 'Error en servicio de documentación'
    });
  }
}

export async function docFetchHandler(args) {
  const startTime = Date.now();
  const timer = toolExecutionDuration.startTimer({ tool_name: 'doc_fetch' });

  try {
    if (!args || typeof args.documentId !== 'string' || !args.documentId.trim()) {
      throw new ValidationError('El parámetro "documentId" es requerido.', { field: 'documentId' });
    }

    const documentId = args.documentId.trim();
    logger.info({ documentId }, 'Obteniendo contenido de documento en doc_fetch');

    const document = await docServiceBreaker.execute(async () => {
      return executeWithRetry(async () => {
        const found = SAMPLE_DOCS.find(d => d.id === documentId || d.title.toLowerCase() === documentId.toLowerCase());
        if (!found) {
          throw new NotFoundError(`Documento con ID '${documentId}' no encontrado.`, { documentId });
        }
        return found;
      });
    });

    const responsePayload = {
      document,
      retrievedAt: new Date().toISOString()
    };

    const responseText = JSON.stringify(responsePayload, null, 2);
    const duration_ms = Date.now() - startTime;

    toolRequestsTotal.inc({ tool_name: 'doc_fetch', status: 'success' });
    timer({ status: 'success' });

    recordActivity({
      tool_name: 'doc_fetch',
      status: 'SUCCESS',
      duration_ms,
      tokens: estimateTokens(responseText),
      details: `Doc ID: ${documentId}`
    });

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ]
    };
  } catch (error) {
    return handleToolError({
      toolName: 'doc_fetch',
      error,
      startTime,
      timer,
      logMessage: 'Fallo al obtener documento en doc_fetch',
      prefix: 'Error en servicio de documentación'
    });
  }
}
