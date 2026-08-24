export function renderDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP-DOC-MID | Observabilidad en Vivo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0b0f19;
      --bg-card: rgba(18, 24, 38, 0.85);
      --bg-card-border: rgba(255, 255, 255, 0.08);
      --accent-cyan: #06b6d4;
      --accent-blue: #3b82f6;
      --accent-purple: #8b5cf6;
      --accent-emerald: #10b981;
      --accent-rose: #f43f5e;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-primary);
      background-image: 
        radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.12) 0px, transparent 50%);
      color: var(--text-main);
      font-family: var(--font-sans);
      min-height: 100vh;
      padding: 24px;
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--bg-card-border);
      margin-bottom: 28px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--accent-emerald);
      box-shadow: 0 0 8px var(--accent-emerald);
      animation: pulseAnim 2s infinite;
    }

    @keyframes pulseAnim {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.2); }
    }

    .grid-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .stat-card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--bg-card-border);
      border-radius: 14px;
      padding: 20px;
      transition: transform 0.2s, border-color 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .stat-val {
      font-size: 28px;
      font-weight: 700;
      font-family: var(--font-mono);
      background: linear-gradient(135deg, #fff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .activity-card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--bg-card-border);
      border-radius: 14px;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }

    th {
      background: rgba(255, 255, 255, 0.03);
      padding: 14px 18px;
      color: var(--text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--bg-card-border);
    }

    td {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-family: var(--font-mono);
    }

    .badge-tag {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-success {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
    }

    .badge-failed {
      background: rgba(244, 63, 94, 0.15);
      color: var(--accent-rose);
    }

    .actions-bar {
      margin-top: 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--bg-card-border);
      color: var(--text-main);
      padding: 8px 16px;
      border-radius: 8px;
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">MCP-DOC-MID</h1>
        <span style="color: var(--text-muted); font-size: 14px;">Enterprise Gateway</span>
      </div>
      <div class="badge-status">
        <span class="pulse"></span>
        <span id="server-status">OPERACIONAL</span>
      </div>
    </header>

    <div class="grid-stats">
      <div class="stat-card">
        <div class="stat-label">Peticiones Totales</div>
        <div class="stat-val" id="stat-requests">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tokens Estimados</div>
        <div class="stat-val" id="stat-tokens">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tasa de Error</div>
        <div class="stat-val" id="stat-error-rate">0%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Uptime</div>
        <div class="stat-val" id="stat-uptime">0s</div>
      </div>
    </div>

    <div class="section-title">
      <span>Registro de Actividad en Vivo</span>
    </div>

    <div class="activity-card">
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Herramienta</th>
            <th>Estado</th>
            <th>Duración</th>
            <th>Tokens</th>
            <th>Detalles</th>
          </tr>
        </thead>
        <tbody id="activity-tbody">
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Esperando llamadas a herramientas MCP...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="actions-bar">
      <button class="btn" onclick="fetchLiveStats()">Actualizar Ahora</button>
      <a href="/metrics" class="btn" target="_blank" style="text-decoration: none;">Prometheus Metrics</a>
      <a href="/health/ready" class="btn" target="_blank" style="text-decoration: none;">Health Ready</a>
    </div>
  </div>

  <script>
    async function fetchLiveStats() {
      try {
        const res = await fetch('/health/diagnostic');
        if (!res.ok) return;
        const data = await res.json();

        const stats = data.stats || {};
        document.getElementById('stat-requests').textContent = stats.totalRequests || 0;
        document.getElementById('stat-tokens').textContent = (stats.totalTokens || 0).toLocaleString();
        
        const total = stats.totalRequests || 0;
        const errors = stats.totalErrors || 0;
        const rate = total > 0 ? ((errors / total) * 100).toFixed(1) : '0.0';
        document.getElementById('stat-error-rate').textContent = rate + '%';

        const uptime = stats.uptimeSeconds || 0;
        const hrs = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const secs = uptime % 60;
        document.getElementById('stat-uptime').textContent = hrs > 0 ? \`\${hrs}h \${mins}m\` : \`\${mins}m \${secs}s\`;

        const activity = data.activity || [];
        const tbody = document.getElementById('activity-tbody');
        if (activity.length > 0) {
          tbody.innerHTML = activity.slice(0, 15).map(item => \`
            <tr>
              <td>\${new Date(item.timestamp).toLocaleTimeString()}</td>
              <td><strong>\${item.tool_name}</strong></td>
              <td><span class="badge-tag \${item.status === 'SUCCESS' ? 'badge-success' : 'badge-failed'}">\${item.status}</span></td>
              <td>\${item.duration_ms}ms</td>
              <td>\${item.tokens}</td>
              <td style="color: var(--text-muted); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${item.details || '-'}</td>
            </tr>
          \`).join('');
        }
      } catch (err) {
        console.error('Error fetching live stats:', err);
      }
    }

    setInterval(fetchLiveStats, 3000);
    fetchLiveStats();
  </script>
</body>
</html>`;
}
