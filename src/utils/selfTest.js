import { config } from './config.js';
import { tools } from '../tools/index.js';
import { register } from './metrics.js';
import { getStoreStats, loadAllSwaggers } from './swaggerStore.js';

export async function runSelfTest() {
  const startTime = Date.now();
  const checks = {
    config: { status: 'pass' },
    tools: { status: 'pass', count: tools.length, names: tools.map(t => t.definition.name) },
    metrics: { status: 'pass' },
    storage: { status: 'pass' },
    swaggers: { status: 'pass' }
  };

  try {
    // 1. Check config
    if (!config.transportMode || !config.port) {
      checks.config = { status: 'fail', error: 'Configuración inválida o incompleta' };
    }

    // 2. Check tools schema
    if (!Array.isArray(tools) || tools.length === 0) {
      checks.tools = { status: 'fail', error: 'No hay herramientas registradas' };
    } else {
      for (const tool of tools) {
        if (!tool.definition || !tool.definition.name || !tool.definition.description || !tool.definition.inputSchema) {
          checks.tools = { status: 'fail', error: `Esquema de herramienta inválido: ${tool?.definition?.name || 'anónima'}` };
          break;
        }
        if (typeof tool.handler !== 'function') {
          checks.tools = { status: 'fail', error: `Handler inválido para herramienta: ${tool.definition.name}` };
          break;
        }
      }
    }

    // 3. Check Prometheus metrics
    const metricsStr = await register.metrics();
    if (typeof metricsStr !== 'string' || metricsStr.length === 0) {
      checks.metrics = { status: 'fail', error: 'Fallo al consultar registro de Prometheus' };
    }

    // 4. Check Swagger Store
    let stats = getStoreStats();
    if (stats.specsCount === 0) {
      await loadAllSwaggers();
      stats = getStoreStats();
    }
    checks.swaggers = {
      status: 'pass',
      specsCount: stats.specsCount,
      endpointsCount: stats.endpointsCount,
      schemasCount: stats.schemasCount
    };

    const durationMs = Date.now() - startTime;
    const isHealthy = Object.values(checks).every(c => c.status === 'pass');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      server: 'mcp-doc-mid',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      durationMs,
      checks
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      server: 'mcp-doc-mid',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      error: error.message,
      checks
    };
  }
}
