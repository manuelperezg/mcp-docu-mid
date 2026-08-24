import pino from 'pino';

// Salida dirigida exclusivamente a stderr
export const logger = pino({
  name: 'mcp-doc-mid',
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime
}, process.stderr);
