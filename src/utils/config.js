import dotenv from 'dotenv';

// Silenciar logs durante la carga para proteger stdout en modo STDIO
const originalLog = console.log;
console.log = () => {};
dotenv.config();
console.log = originalLog;

export const config = {
  transportMode: (process.env.TRANSPORT_MODE || 'stdio').toLowerCase(),
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  mcpApiKey: process.env.MCP_API_KEY || 'default-mcp-secret-key',
  dashboardUser: process.env.DASHBOARD_USER || 'admin',
  dashboardPassword: process.env.DASHBOARD_PASSWORD || 'admin',
  enableAuth: process.env.ENABLE_AUTH !== 'false',
  allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : ['*'],
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
  statsStorageEnabled: process.env.STATS_STORAGE_ENABLED !== 'false',
  statsStoragePath: process.env.STATS_STORAGE_PATH || 'data/stats.json',
  swaggersDir: process.env.SWAGGERS_DIR || 'swaggers'
};
