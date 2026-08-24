import express from 'express';
import helmet from 'helmet';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { register, getStats, getActivityLog, httpRequestsTotal } from '../utils/metrics.js';
import {
  apiAuthMiddleware,
  dashboardAuthMiddleware,
  sessionBindingMiddleware,
  registerAuthenticatedSession,
  unregisterSession
} from '../middleware/authMiddleware.js';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware.js';
import { expressErrorHandler } from '../errors/errorHandler.js';
import { renderDashboardHtml } from './dashboardHtml.js';

export function createExpressApp(createMcpServer) {
  const app = express();

  // 1. Hardening de seguridad con Helmet
  app.use(helmet({
    contentSecurityPolicy: false // Permitir dashboard inline scripts/styles
  }));

  // 2. Manejo de CORS
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = config.allowedOrigins;

    if (allowed.includes('*') || (origin && allowed.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-session-id');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // 3. Rate limiting global
  app.use(rateLimitMiddleware);

  // 4. Métricas HTTP middleware
  app.use((req, res, next) => {
    res.on('finish', () => {
      const route = req.route ? req.route.path : req.path;
      httpRequestsTotal.inc({
        method: req.method,
        route,
        status_code: String(res.statusCode)
      });
    });
    next();
  });

  // Transports activos mapeados por sessionId
  const transports = new Map();

  // Endpoint SSE: Inicia conexión y registra sesión autorizada (Session Binding)
  app.get('/sse', apiAuthMiddleware, async (req, res, next) => {
    try {
      logger.info({ ip: req.ip }, 'Nueva conexión SSE entrante.');
      const transport = new SSEServerTransport('/messages', res);
      const mcpServer = createMcpServer();

      registerAuthenticatedSession(transport.sessionId, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      transports.set(transport.sessionId, transport);

      req.on('close', () => {
        logger.info({ sessionId: transport.sessionId }, 'Conexión SSE cerrada.');
        unregisterSession(transport.sessionId);
        transports.delete(transport.sessionId);
      });

      await mcpServer.connect(transport);
    } catch (error) {
      next(error);
    }
  });

  // Endpoint de Mensajes JSON-RPC MCP
  app.post('/messages', express.json(), sessionBindingMiddleware, async (req, res, next) => {
    try {
      const transport = transports.get(req.sessionId);
      if (!transport) {
        return res.status(404).json({ error: 'Transporte de sesión no encontrado o finalizado.' });
      }

      await transport.handlePostMessage(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Endpoint de Métricas Prometheus
  app.get('/metrics', async (req, res, next) => {
    try {
      res.setHeader('Content-Type', register.contentType);
      res.send(await register.metrics());
    } catch (error) {
      next(error);
    }
  });

  // Endpoints de Salud (Health Checks)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
  });

  app.get('/health/ready', (req, res) => {
    res.json({ status: 'ready', server: 'mcp-doc-mid', version: '1.0.0' });
  });

  app.get('/health/diagnostic', (req, res) => {
    res.json({
      status: 'healthy',
      server: 'mcp-doc-mid',
      version: '1.0.0',
      stats: getStats(),
      activity: getActivityLog()
    });
  });

  // Dashboard Visual en Vivo
  app.get('/dashboard', dashboardAuthMiddleware, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderDashboardHtml());
  });

  // Manejador global de errores Express
  app.use(expressErrorHandler);

  return app;
}

export function startSseServer(createMcpServer, port = config.port) {
  const app = createExpressApp(createMcpServer);

  const server = app.listen(port, () => {
    logger.info({ port, mode: config.transportMode }, `Servidor MCP iniciado en modo SSE/HTTP en el puerto ${port}`);
  });

  return server;
}
