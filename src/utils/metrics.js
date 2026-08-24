import client from 'prom-client';

export const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'mcp_doc_mid_'
});

export const toolRequestsTotal = new client.Counter({
  name: 'mcp_tool_requests_total',
  help: 'Total de ejecuciones de herramientas MCP',
  labelNames: ['tool_name', 'status'],
  registers: [register]
});

export const toolExecutionDuration = new client.Histogram({
  name: 'mcp_tool_execution_duration_seconds',
  help: 'Duración de ejecución de herramientas MCP en segundos',
  labelNames: ['tool_name', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register]
});

export const httpRequestsTotal = new client.Counter({
  name: 'mcp_http_requests_total',
  help: 'Total de peticiones HTTP al servidor SSE',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// En memoria: historial de actividad y acumuladores
const MAX_ACTIVITY_LOGS = 100;
let activityLog = [];

let cumulativeStats = {
  totalTokens: 0,
  totalRequests: 0,
  totalErrors: 0,
  toolsUsage: {},
  startedAt: new Date().toISOString()
};

export function estimateTokens(text) {
  if (!text) return 0;
  const str = typeof text === 'string' ? text : JSON.stringify(text);
  return Math.ceil(str.length / 4);
}

export function recordActivity({ tool_name, status, duration_ms, tokens = 0, details = '' }) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    tool_name,
    status,
    duration_ms: Math.round(duration_ms),
    tokens: Math.round(tokens),
    details: typeof details === 'string' ? details.slice(0, 200) : ''
  };

  activityLog.unshift(entry);
  if (activityLog.length > MAX_ACTIVITY_LOGS) {
    activityLog.pop();
  }

  cumulativeStats.totalRequests += 1;
  cumulativeStats.totalTokens += tokens;
  if (status === 'FAILED' || status === 'error') {
    cumulativeStats.totalErrors += 1;
  }

  cumulativeStats.toolsUsage[tool_name] = (cumulativeStats.toolsUsage[tool_name] || 0) + 1;
}

export function getActivityLog() {
  return [...activityLog];
}

export function getStats() {
  return {
    ...cumulativeStats,
    uptimeSeconds: Math.round(process.uptime()),
    memoryUsage: process.memoryUsage(),
    activeActivitiesCount: activityLog.length
  };
}

export function setStats(loadedStats) {
  if (!loadedStats || typeof loadedStats !== 'object') return;
  cumulativeStats = {
    ...cumulativeStats,
    ...loadedStats,
    toolsUsage: {
      ...cumulativeStats.toolsUsage,
      ...(loadedStats.toolsUsage || {})
    }
  };
}

export function resetMetricsForTests() {
  activityLog = [];
  cumulativeStats = {
    totalTokens: 0,
    totalRequests: 0,
    totalErrors: 0,
    toolsUsage: {},
    startedAt: new Date().toISOString()
  };
}
