import { config } from '../utils/config.js';
import { AuthenticationError, ForbiddenError } from '../errors/index.js';

// Gestión de sesiones autenticadas para Session Binding (Prevenir Session Hijacking)
const activeSessions = new Map();

export function registerAuthenticatedSession(sessionId, metadata = {}) {
  if (!sessionId) return;
  activeSessions.set(sessionId, {
    registeredAt: Date.now(),
    lastActivity: Date.now(),
    ...metadata
  });
}

export function validateSession(sessionId) {
  if (!sessionId) return false;
  const session = activeSessions.get(sessionId);
  if (!session) return false;
  session.lastActivity = Date.now();
  return true;
}

export function unregisterSession(sessionId) {
  if (!sessionId) return;
  activeSessions.delete(sessionId);
}

export function getActiveSessionCount() {
  return activeSessions.size;
}

export function resetSessionsForTests() {
  activeSessions.clear();
}

/**
 * Middleware para validar Session Binding en el endpoint /messages
 */
export function sessionBindingMiddleware(req, res, next) {
  const sessionId = req.query.sessionId || req.headers['x-session-id'];

  if (!sessionId) {
    return next(new ForbiddenError('Parámetro sessionId requerido en la petición.'));
  }

  if (!validateSession(sessionId)) {
    return next(new ForbiddenError(`Sesión no autorizada o expirada (sessionId: ${sessionId}). Debe iniciar conexión SSE primero.`));
  }

  req.sessionId = sessionId;
  next();
}

/**
 * Middleware de autenticación Bearer / API Key para endpoints de API
 */
export function apiAuthMiddleware(req, res, next) {
  if (!config.enableAuth) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  if (apiKeyHeader && apiKeyHeader === config.mcpApiKey) {
    return next();
  }

  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && token === config.mcpApiKey) {
      return next();
    }
  }

  return next(new AuthenticationError('API Key o Bearer Token ausente o no válido.'));
}

/**
 * Middleware de Basic Auth para el Dashboard
 */
export function dashboardAuthMiddleware(req, res, next) {
  if (!config.enableAuth) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="MCP-DOC-MID Dashboard"');
    return res.status(401).send('Autenticación requerida para acceder al Dashboard.');
  }

  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [user, password] = credentials.split(':');

    if (user === config.dashboardUser && password === config.dashboardPassword) {
      return next();
    }
  } catch (error) {
    // Ignorar y caer en 401
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="MCP-DOC-MID Dashboard"');
  return res.status(401).send('Credenciales inválidas para acceder al Dashboard.');
}
