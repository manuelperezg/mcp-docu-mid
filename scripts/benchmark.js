import { docSearchHandler, docFetchHandler } from '../src/tools/documentation/handler.js';

function calculatePercentile(sortedArray, percentile) {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('  MCP-DOC-MID: BENCHMARK & LATENCY PERFORMANCE TEST');
  console.log('====================================================\n');

  const iterations = 100;
  const latencies = [];
  let successful = 0;
  let failed = 0;

  console.log(`Ejecutando ${iterations} iteraciones de doc_search y doc_fetch...`);

  const benchmarkStart = Date.now();

  for (let i = 0; i < iterations; i++) {
    const isSearch = i % 2 === 0;
    const start = performance.now();

    try {
      if (isSearch) {
        await docSearchHandler({ query: 'arquitectura', limit: 3 });
      } else {
        await docFetchHandler({ documentId: 'arch-mcp-overview' });
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

  console.log('\n--- RESULTADOS DEL BENCHMARK ---');
  console.log(`Total Ejecuciones: ${iterations}`);
  console.log(`Exitosas:          ${successful}`);
  console.log(`Fallidas:          ${failed}`);
  console.log(`Throughput:        ${opsPerSec} ops/seg`);
  console.log(`Tiempo Total:      ${totalTimeMs} ms\n`);

  console.log('--- PERCENTILES DE LATENCIA (ms) ---');
  console.table({
    Min: `${min} ms`,
    Avg: `${avg} ms`,
    p50: `${p50} ms`,
    p90: `${p90} ms`,
    p95: `${p95} ms`,
    p99: `${p99} ms`,
    Max: `${max} ms`
  });
  console.log('====================================================\n');
}

runBenchmark().catch((err) => {
  console.error('Error en ejecución de benchmark:', err);
  process.exit(1);
});
