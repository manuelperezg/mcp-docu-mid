# Guía de Gestión de Archivos Swagger y OpenAPI (`swaggers/`)

El servidor **MCP-DOC-MID** utiliza la carpeta `swaggers/` como su base de conocimiento principal. Al iniciar el servidor, todos los archivos presentes en este directorio son analizados, dereferenciados e indexados en memoria estructurada.

---

## 📁 Formatos y Versiones Soportadas

El motor `@apidevtools/swagger-parser` soporta:
- **OpenAPI 3.1.x** (`.yml`, `.yaml`, `.json`)
- **OpenAPI 3.0.x** (`.yml`, `.yaml`, `.json`)
- **Swagger 2.0** (`.yml`, `.yaml`, `.json`)

---

## 🚀 Cómo Agregar Nuevas Especificaciones

1. **Colocar el archivo**:
   Guarda tu archivo `.yml`, `.yaml` o `.json` directamente dentro de la carpeta `swaggers/` (o en cualquier subcarpeta dentro de `swaggers/`):
   ```text
   swaggers/
   ├── payments/
   │   └── stripe-integration.yml
   ├── loyalty-api.yml
   └── flights-api.json
   ```

2. **Resolución Automática de `$ref` (Dereferencing)**:
   - Puedes usar referencias internas estándar: `$ref: '#/components/schemas/UserProfile'`
   - Puedes usar referencias a parámetros: `$ref: '#/components/parameters/PageLimit'`
   - El parser resolverá automáticamente los objetos y los incrustará en línea en la memoria RAM del servidor.

3. **Reiniciar o Verificar con Self-Test**:
   Para verificar inmediatamente que tu nuevo archivo fue parseado correctamente sin errores de sintaxis:
   ```bash
   npm run self-test
   ```
   El reporte mostrará el conteo actualizado de `specsCount`, `endpointsCount` y `schemasCount`.

---

## ⚡ Estrategia de Carga Hiper-Rápida (Snapshot Caching)

Para especificaciones OpenAPI voluminosas (como `middleware-internal.json` de 260KB+ con cientos de endpoints y schemas):
1. **Validación por Hash SHA-256**: Al leer cada archivo, se genera un hash criptográfico basado en su contenido y timestamp de modificación (`mtimeMs`).
2. **Snapshot en `.cache/swaggers/`**: El resultado del dereference completo se guarda como un snapshot JSON pre-calculado.
3. **Hidratación en < 2 ms**: En inicios subsecuentes, el servidor verifica el hash y restaura directamente la memoria en **1 a 3 ms**, evitando el costo de CPU de parsear el AST de OpenAPI repetidamente.
4. **Invalidación Automática**: Si editas cualquier archivo `.yml` o `.json`, el hash cambia y el sistema re-dereferencia el archivo de manera transparente.
5. **Índices en Memoria $O(1)$**: Las consultas a `getEndpointDoc` y `getSchemaDoc` resuelven en $O(1)$ mediante tablas hash compuestas (`METHOD:PATH` y `SCHEMANAME`).

---

## 🛠️ Buenas Prácticas para Especificaciones OpenAPI

1. **Incluir Título y Versión**: Asegúrate de que la sección `info` incluya `title`, `version` y `description`.
2. **Definir Servidores Base (`servers`)**: Define la URL base de tu API en `servers: [{ url: "https://api.empresa.com/v1" }]` para que los snippets generados por `generate_integration_code` apunten al host correcto.
3. **Documentar Ejemplos (`example` / `examples`)**: Agregar ejemplos en los esquemas permite al generador de código crear payloads y valores de prueba realistas para los LLMs.
4. **Definir `securitySchemes`**: Declarar tus esquemas de seguridad en `components.securitySchemes` para que la herramienta `get_security_schemes` los exponga al cliente.
