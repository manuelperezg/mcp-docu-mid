# MCP-DOC-MID: Servidor MCP para OpenAPI y Generación de Integraciones

Servidor MCP de grado empresarial especializado en **aprender, dereferenciar (`$ref`) y permitir que un LLM consulte especificaciones OpenAPI/Swagger y genere integraciones de código listas para producción**.

Utiliza `@apidevtools/swagger-parser` para dereferenciar todos los modelos y esquemas en memoria al arrancar y proporciona un conjunto de 8 herramientas para inspección, validación y generación de código en múltiples lenguajes (TypeScript, Python, JavaScript, cURL, C#).

---

## 🏛️ Características Principales

1. **Lectura y Dereference Automático (`swaggers/`)**:
   - Escaneo recursivo de archivos `.yml`, `.yaml` y `.json`.
   - Resolución completa de referencias `$ref` en componentes, parámetros y modelos.
2. **Generación de Integraciones de Código para LLM**:
   - `generate_integration_code`: Genera snippets y clientes fuertemente tipados para cualquier endpoint.
   - Soporte para TypeScript (`fetch`/`axios`), JavaScript, Python (`httpx`/`requests`), cURL y C#.
3. **Validación y Extracción de Seguridad**:
   - `validate_payload`: Comprobación previa de que un payload JSON cumpla con tipos y campos requeridos.
   - `get_security_schemes`: Extracción de esquemas de autenticación (Bearer tokens, API keys, OAuth2).
4. **Transporte Dual**:
   - **STDIO**: Integración estándar con Claude Desktop, Antigravity, Cursor y extensiones MCP.
   - **SSE / HTTP**: Servidor Express con `/sse`, `/messages`, `/metrics`, `/health` y `/dashboard`.
5. **Observabilidad y Seguridad**:
   - Logs dirigidos a `process.stderr` con **Pino**.
   - Métricas Prometheus (`prom-client`).
   - Session Binding y protección contra Session Hijacking.

---

## 📂 Directorio de Swaggers (`swaggers/`)

Coloca tus archivos OpenAPI en la carpeta `swaggers/`:

```text
swaggers/
├── loyalty-api.yml       # Doters Loyalty API
└── flights-api.json      # Viva Flights Booking API
```

---

## 🛠️ Herramientas MCP para el LLM

| Herramienta | Descripción | Parámetros Principales |
| :--- | :--- | :--- |
| `list_specs` | Lista todas las APIs cargadas con sus versiones, servidores y conteo de rutas. | *Ninguno* |
| `search_docs` | Busca endpoints, modelos y descripciones por palabras clave. | `query`, `specId`, `tag`, `limit` |
| `get_endpoint_doc` | Obtiene la especificación completa y dereferenciada de un endpoint. | `path`, `method`, `specId` |
| `get_schema_doc` | Obtiene el modelo de datos / schema dereferenciado. | `schemaName`, `specId` |
| `generate_integration_code` | Genera código de cliente listo para producción (TS, Python, JS, cURL, C#). | `path`, `method`, `language`, `clientType`, `specId` |
| `get_security_schemes` | Obtiene esquemas de autenticación y cabeceras requeridas. | `specId` |
| `validate_payload` | Valida un payload JSON contra el schema de un endpoint antes de invocarlo. | `schemaName`, `payload`, `specId` |
| `query_api_knowledge` | Sintetiza respuestas a preguntas de negocio o arquitectura sobre las APIs. | `query`, `specId` |

---

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Autodiagnóstico en runtime (<5ms)
npm run self-test

# Iniciar en modo STDIO
npm start

# Iniciar en modo SSE/HTTP
TRANSPORT_MODE=sse PORT=3000 npm start
```

---

## 🧪 Pruebas y Rendimiento

```bash
# Suite completa con reporte de cobertura (>= 85%)
npm run test:coverage

# Pruebas de carga (100 agentes concurrentes)
npm run test:load

# Benchmark de latencia y throughput
npm run benchmark
```
