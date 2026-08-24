import { AppError } from './AppError.js';
import { logger } from '../utils/logger.js';
import { toolRequestsTotal, recordActivity, estimateTokens } from '../utils/metrics.js';

export function normalizeError(error) {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : String(error || 'Error desconocido');
  return new AppError(message, {
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    isOperational: false,
    details: error instanceof Error ? { stack: error.stack } : null
  });
}

export function handleToolError({ toolName, error, startTime, timer, logMessage, prefix = 'Error' }) {
  const appError = normalizeError(error);

  logger.error(
    {
      tool_name: toolName,
      code: appError.code,
      statusCode: appError.statusCode,
      error: appError.message,
      details: appError.details
    },
    logMessage || `Error ejecutando herramienta MCP '${toolName}'`
  );

  toolRequestsTotal.inc({ tool_name: toolName, status: 'error' });
  if (typeof timer === 'function') timer({ status: 'error' });

  if (typeof startTime === 'number') {
    const duration_ms = Date.now() - startTime;
    recordActivity({
      tool_name: toolName,
      status: 'FAILED',
      duration_ms,
      tokens: estimateTokens(appError.message),
      details: `[${appError.code}] ${appError.message}`
    });
  }

  return {
    isError: true,
    content: [{ type: 'text', text: `${prefix}: ${appError.message}` }]
  };
}

export function expressErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const appError = normalizeError(err);
  logger.error({ ip: req.ip, path: req.path, method: req.method, code: appError.code, error: appError.message }, 'Error en Express HTTP');
  res.status(appError.statusCode).json(appError.toJson());
}
