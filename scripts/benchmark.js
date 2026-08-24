import {
  searchDocsHandler,
  getEndpointDocHandler,
  getSchemaDocHandler,
  generateIntegrationCodeHandler,
  validatePayloadHandler,
  queryApiKnowledgeHandler
} from '../src/tools/documentation/handler.js';
import { loadAllSwaggers, clearSwaggerCache } from '../src/utils/swaggerStore.js';

function calculatePercentile(sortedArray, percentile) {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

async function runBenchmark() {
  console.log('================================================================');
  console.log('  MCP-DOC-MID: HYPER-FAST SWAGGER & CODE GEN BENCHMARK');
  console.log('================================================================\n');

  // 1. Benchmark de Cold Start (Sin Caché)
  console.log('1. Probando COLD START (dereferenciación completa de 140+ endpoints)...');
  clearSwaggerCache();
  const coldStartTimer = performance.now();
  const coldStoreInfo = await loadAllSwaggers('swaggers', { force: true });
  const coldDuration = (performance.now() - coldStartTimer).toFixed(2);
  console.log(`   -> Cold Start: ${coldDuration} ms (${coldStoreInfo.specsCount} specs, ${coldStoreInfo.endpointsCount} endpoints, ${coldStoreInfo.schemasCount} schemas)\n`);

  // 2. Benchmark de Warm Cached Start (Snapshot Cache)
  console.log('2. Probando WARM CACHED START (hidratación instantánea de snapshots)...');
  const warmStartTimer = performance.now();
  const warmStoreInfo = await loadAllSwaggers('swaggers');
  const warmDuration = (performance.now() - warmStartTimer).toFixed(2);
  console.log(`   -> Warm Cached Start: ${warmDuration} ms (Cache Hits: ${warmStoreInfo.cacheHits}, Misses: ${warmStoreInfo.cacheMisses})`);
  console.log(`   -> Aceleración / Speedup: ${(parseFloat(coldDuration) / Math.max(parseFloat(warmDuration), 0.1)).toFixed(1)}x más rápido!\n`);

  // 3. Benchmark de Consultas y Generación de Código Concurrentes
  const iterations = 100;
  const latencies = [];
  let successful = 0;
  let failed = 0;

  console.log(`3. Ejecutando ${iterations} consultas y generaciones de código de alto rendimiento...`);

  const benchmarkStart = Date.now();

  for (let i = 0; i < iterations; i++) {
    const mod = i % 5;
    const start = performance.now();

    try {
      if (mod === 0) {
        await searchDocsHandler({ query: 'balances', limit: 5 });
      } else if (mod === 1) {
        await getEndpointDocHandler({ path: '/v1/members/{memberId}/balances', method: 'GET' });
      } else if (mod === 2) {
        await generateIntegrationCodeHandler({ path: '/v1/member-transactions/points/accrual/avasa', method: 'POST', language: 'typescript' });
      } else if (mod === 3) {
        await validatePayloadHandler({
          schemaName: 'AccrualRequest',
          payload: { amountSpent: 1200, partnerId: 'VIVA-MX', referenceNumber: '123' }
        });
      } else {
        await queryApiKnowledgeHandler({ query: 'acumulación de puntos en renta de autos' });
      }
      const duration = performance.now() - start;
      latencies.push(duration);
      successful++;
    } catch (err) {
      failed++;
    }
  }

  const totalTimeMs = Date.now() - benchmarkStart;
  latencies.sort((a, b) => a - b);

  const sum = latencies.reduce((acc, val) => acc + val, 0);
  const avg = latencies.length > 0 ? (sum / latencies.length).toFixed(2) : 0;
  const min = latencies.length > 0 ? latencies[0].toFixed(2) : 0;
  const max = latencies.length > 0 ? latencies[latencies.length - 1].toFixed(2) : 0;
  const p50 = calculatePercentile(latencies, 50).toFixed(2);
  const p90 = calculatePercentile(latencies, 90).toFixed(2);
  const p95 = calculatePercentile(latencies, 95).toFixed(2);
  const p99 = calculatePercentile(latencies, 99).toFixed(2);
  const opsPerSec = ((successful / (totalTimeMs / 1000))).toFixed(2);

  console.log('\n--- RESULTADOS DE RENDIMIENTO Y LATENCIA ---');
  console.log(`Total Invocaciones: ${iterations}`);
  console.log(`Exitosas:           ${successful}`);
  console.log(`Fallidas:           ${failed}`);
  console.log(`Throughput:         ${opsPerSec} ops/seg`);
  console.log(`Tiempo Total:       ${totalTimeMs} ms\n`);

  console.log('--- PERCENTILES DE LATENCIA POR HERRAMIENTA (ms) ---');
  console.table({
    Min: `${min} ms`,
    Avg: `${avg} ms`,
    p50: `${p50} ms`,
    p90: `${p90} ms`,
    p95: `${p95} ms`,
    p99: `${p99} ms`,
    Max: `${max} ms`
  });
  console.log('================================================================\n');
}

runBenchmark().catch((err) => {
  console.error('Error en ejecución de benchmark:', err);
  process.exit(1);
});
