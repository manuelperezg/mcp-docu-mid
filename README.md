# MCP-DOC-MID

Servidor de grado empresarial para el ecosistema **Model Context Protocol (MCP)** en Node.js (ES Modules), diseñado para gestión y consulta documental de alto rendimiento, observabilidad y resiliencia distribuida.

---

## 🏛️ Arquitectura y Principios de Diseño

1. **Cero Polución de `process.stdout` en STDIO**:
   - Toda la comunicación con el cliente local MCP utiliza exclusivamente `process.stdout` para JSON-RPC.
   - El sistema de logging utiliza **Pino** redirigido estrictamente a `process.stderr`.
   - `dotenv.config()` se ejecuta en modo silencioso.
2. **Doble Modo de Transporte (Dual Transport)**:
   - **STDIO**: Conexión nativa para clientes locales (Claude Desktop, Antigravity, Cursor, CLI).
   - **SSE / HTTP**: Servidor Express con endpoints `/sse`, `/messages`, `/metrics`, `/health` y `/dashboard`.
3. **Session Binding & Seguridad Enterprise**:
   - Protección contra Session Hijacking en `/messages` vinculando cada solicitud al `sessionId` validado en la conexión SSE inicial.
   - Autenticación por Bearer Token / API Key (`x-api-key`).
   - Rate limiting configurable con `express-rate-limit`.
   - Hardening de cabeceras HTTP con `helmet`.
4. **Resiliencia con Circuit Breaker y Reintentos**:
   - Cada servicio externo u operación crítica utiliza instancias de `CircuitBreaker` (`CLOSED`, `OPEN`, `HALF_OPEN`) y reintentos exponenciales con `p-retry`.
5. **Observabilidad y Persistencia Atómica**:
   - Registro de métricas Prometheus (`prom-client`) en `/metrics`.
   - Bitácora de actividad en vivo y estimación de tokens.
   - Dashboard web embebido en `/dashboard` con autenticación Basic Auth.
   - Persistencia atómica de estadísticas en `data/stats.json` con debouncing (300ms) y volcado síncrono al terminar el proceso.

---

## 📦 Instalación y Requisitos

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0

```bash
# Clonar e instalar dependencias
npm install
```

---

## ⚙️ Variables de Entorno

Configura tu archivo `.env` tomando como base `.env.example`:

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `TRANSPORT_MODE` | Modo de transporte (`stdio`, `sse`, `http`) | `stdio` |
| `PORT` | Puerto de escucha para modo SSE/HTTP | `3000` |
| `LOG_LEVEL` | Nivel de logs (`debug`, `info`, `warn`, `error`) | `info` |
| `MCP_API_KEY` | Llave secreta para autenticación de API | `default-mcp-secret-key` |
| `ENABLE_AUTH` | Habilitar/deshabilitar autenticación (`true`/`false`) | `true` |
| `ALLOWED_ORIGINS` | Orígenes permitidos para CORS (separados por coma o `*`) | `*` |
| `DASHBOARD_USER` | Usuario para acceso al Dashboard web | `admin` |
| `DASHBOARD_PASSWORD`| Contraseña para acceso al Dashboard web | `admin` |
| `RATE_LIMIT_WINDOW_MS`| Ventana de tiempo para Rate Limit en ms | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Máximo de peticiones por ventana | `1000` |
| `STATS_STORAGE_ENABLED`| Persistencia de estadísticas en disco | `true` |
| `STATS_STORAGE_PATH`| Ruta del archivo de persistencia | `data/stats.json` |

---

## 🚀 Modos de Ejecución

### 1. Modo STDIO (CLI Local)
```bash
npm start
```

### 2. Modo SSE / HTTP (Servidor Web)
```bash
TRANSPORT_MODE=sse PORT=3000 npm start
```

### 3. Autodiagnóstico en Runtime (<100ms)
```bash
npm run self-test
```

### 4. Inspector de MCP
```bash
npm run inspect
```

---

## 🛠️ Herramientas Disponibles

### 1. `doc_search`
Busca artículos y especificaciones en la base documental.
- **Parámetros**:
  - `query` (*string, requerido*): Término o palabras clave a buscar.
  - `category` (*string, opcional*): Categoría temática (`api`, `architecture`, `deployment`, `guides`).
  - `limit` (*integer, opcional*): Límite de resultados (1 a 20, default: 5).

### 2. `doc_fetch`
Obtiene el contenido completo y metadatos de un documento específico.
- **Parámetros**:
  - `documentId` (*string, requerido*): ID único o ruta del documento.

---

## 🧪 Pruebas y Benchmarks

El proyecto cuenta con una pirámide de pruebas con umbral de cobertura mínimo del 85%:

```bash
# Ejecutar todas las pruebas unitarias, de contrato e integración
npm test

# Ejecutar con reporte de cobertura de código
npm run test:coverage

# Ejecutar pruebas de carga y concurrencia (100+ agentes)
npm run test:load

# Ejecutar benchmark de rendimiento y cálculo de percentiles (p50, p90, p99)
npm run benchmark

# Pipeline de CI completo
npm run test:ci
```

---

## 🐳 Docker

Construcción y ejecución con Docker multi-stage:

```bash
docker build -t mcp-doc-mid:latest .
docker run -p 3000:3000 -e TRANSPORT_MODE=sse mcp-doc-mid:latest
```
