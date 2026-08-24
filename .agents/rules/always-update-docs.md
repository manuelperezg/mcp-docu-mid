# REGLA OBLIGATORIA: ACTUALIZACIÓN CONTINUA DE DOCUMENTACIÓN

Cada vez que se realice cualquier modificación en el código, arquitectura, herramientas MCP, esquemas OpenAPI, dependencias o configuración del proyecto:

1. **Actualización Obligatoria de `README.md`**:
   - Reflejar inmediatamente cualquier nueva herramienta, parámetro o cambio de comportamiento.
   - Mantener actualizadas las tablas de variables de entorno y comandos de ejecución.

2. **Actualización de la Carpeta `docs/`**:
   - Mantener sincronizados [docs/ARCHITECTURE.md](file:///c:/Users/Manuel/Documents/vivaaerobus/Doters/MCP/mcp-docu-mid/docs/ARCHITECTURE.md), [docs/TOOLS_REFERENCE.md](file:///c:/Users/Manuel/Documents/vivaaerobus/Doters/MCP/mcp-docu-mid/docs/TOOLS_REFERENCE.md) y [docs/SWAGGER_GUIDE.md](file:///c:/Users/Manuel/Documents/vivaaerobus/Doters/MCP/mcp-docu-mid/docs/SWAGGER_GUIDE.md).

3. **Documentación en Código y Docstrings**:
   - Todas las funciones exportadas, handlers y modelos deben tener comentarios JSDoc claros indicando propósito, tipos de parámetros y valores de retorno.

4. **Preservación de Ejemplos Prácticos**:
   - Incluir ejemplos de invocación JSON-RPC y fragmentos de código generados en TypeScript, Python, JavaScript, cURL y C# para que los desarrolladores y LLMs cuenten con referencias operativas exactas.
