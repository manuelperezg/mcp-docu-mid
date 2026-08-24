# Referencia Exhaustiva de Herramientas MCP (MCP-DOC-MID)

Este documento detalla cada una de las 8 herramientas expuestas por el servidor **MCP-DOC-MID** para que desarrolladores y modelos de lenguaje (LLMs) puedan interactuar, consultar APIs y generar código de integración con precisión milimétrica.

---

## 📋 Catálogo Rápido de Herramientas

| # | Herramienta | Propósito Principal |
| :- | :--- | :--- |
| 1 | [`list_specs`](#1-list_specs) | Listar todas las APIs aprendidas y dereferenciadas en memoria. |
| 2 | [`search_docs`](#2-search_docs) | Buscar endpoints, modelos y descripciones por palabras clave. |
| 3 | [`get_endpoint_doc`](#3-get_endpoint_doc) | Obtener la definición completa dereferenciada de un endpoint. |
| 4 | [`get_schema_doc`](#4-get_schema_doc) | Obtener la definición de un modelo de datos o schema de componente. |
| 5 | [`generate_integration_code`](#5-generate_integration_code) | Generar snippets de integración en TypeScript, Python, JS, cURL o C#. |
| 6 | [`get_security_schemes`](#6-get_security_schemes) | Consultar esquemas de autenticación y tokens requeridos por las APIs. |
| 7 | [`validate_payload`](#7-validate_payload) | Validar un payload JSON contra el schema de un endpoint antes de invocarlo. |
| 8 | [`query_api_knowledge`](#8-query_api_knowledge) | Consultar y sintetizar respuestas transversales sobre las APIs aprendidas. |

---

## 1. `list_specs`

### Descripción
Retorna un listado consolidado de todas las especificaciones OpenAPI/Swagger (`.yml` y `.json`) aprendidas en memoria, incluyendo su identificador (`id`), título, versión, servidores base y conteo de rutas y modelos.

### Parámetros
*Esta herramienta no requiere parámetros.*

### Ejemplo de Respuesta
```json
{
  "totalSpecs": 1,
  "specs": [
    {
      "id": "middleware-api",
      "fileName": "middleware-api.json",
      "filePath": "swaggers/middleware-api.json",
      "title": "Doters API - Internal",
      "version": "2.0",
      "description": "API interna de middleware para servicios de socios, transacciones, balances y aliados Doters.",
      "openapiVersion": "3.0.0",
      "servers": [],
      "pathsCount": 110,
      "schemasCount": 221
    }
  ]
}
```

---

## 2. `search_docs`

### Descripción
Realiza búsquedas contextuales por palabras clave en todos los endpoints, tags, descripciones y modelos de datos indexados.

### Parámetros
- `query` (*string, requerido*): Término de búsqueda (ej. `"balances"`, `"login"`, `"memberId"`).
- `specId` (*string, opcional*): Limitar la búsqueda a una API específica (ej. `"middleware-api"`).
- `tag` (*string, opcional*): Filtrar por etiqueta o tag (ej. `"MemberApi"`, `"Security"`, `"CarRental"`).
- `limit` (*integer, opcional*): Número máximo de resultados (por defecto `10`, máx `50`).

---

## 3. `get_endpoint_doc`

### Descripción
Recupera la especificación completa de un endpoint con **todos los `$ref` dereferenciados en línea**, incluyendo parámetros de ruta, parámetros query, cuerpo de la petición (`requestBody`) y códigos de respuesta con sus esquemas JSON.

### Parámetros
- `path` (*string, requerido*): Ruta del endpoint (ej. `"/v1/members/{memberId}/balances"`, `"/v1/security/login"`).
- `method` (*string, opcional*): Método HTTP (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`). Por defecto `GET`.
- `specId` (*string, opcional*): ID de la especificación a consultar (ej. `"middleware-api"`).

---

## 4. `get_schema_doc`

### Descripción
Recupera la definición completa de un modelo de datos o schema (`components.schemas.*` o `definitions.*`) totalmente dereferenciado (propiedades, tipos, campos obligatorios, ejemplos y enums).

### Parámetros
- `schemaName` (*string, requerido*): Nombre del schema (ej. `"LoginRequestDto"`, `"MemberBalanceResponseDto"`).
- `specId` (*string, opcional*): ID de la especificación.

---

## 5. `generate_integration_code`

### Descripción
Genera un cliente o snippet de código completo y listo para producción, adaptado con los tipos de datos, parámetros e interpolación de variables del endpoint dereferenciado.

### Parámetros
- `path` (*string, requerido*): Ruta del endpoint a integrar.
- `method` (*string, opcional*): Método HTTP (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`).
- `language` (*string, opcional*): Lenguaje destino (`typescript`, `javascript`, `python`, `curl`, `csharp`). Por defecto `typescript`.
- `clientType` (*string, opcional*): Librería cliente (`fetch`, `axios`, `httpx`, `requests`).
- `specId` (*string, opcional*): ID de la especificación.

---

## 6. `get_security_schemes`

### Descripción
Extrae todos los esquemas de autenticación y seguridad declarados en las especificaciones (Bearer Token, API Key en cabecera/query, OAuth2, OpenID Connect).

### Parámetros
- `specId` (*string, opcional*): ID de la especificación (si se omite, retorna la de todas las APIs).

---

## 7. `validate_payload`

### Descripción
Valida si un objeto JSON cumple con la estructura requerida, tipos de datos y restricciones de un schema OpenAPI antes de enviar una petición.

### Parámetros
- `schemaName` (*string, requerido*): Nombre del schema a validar.
- `payload` (*object, requerido*): Objeto JSON a verificar.
- `specId` (*string, opcional*): ID de la especificación.

---

## 8. `query_api_knowledge`

### Descripción
Herramienta de síntesis diseñada para responder preguntas de alto nivel sobre las capacidades, reglas de negocio o endpoints disponibles en las APIs aprendidas.

### Parámetros
- `query` (*string, requerido*): Pregunta o consulta técnica/funcional.
- `specId` (*string, opcional*): ID de la especificación.
