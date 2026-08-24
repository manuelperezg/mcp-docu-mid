export const listSpecsToolDefinition = {
  name: 'list_specs',
  description: 'Lista todas las especificaciones OpenAPI/Swagger (.yml y .json) que han sido aprendidas y dereferenciadas en memoria con sus servidores y versiones.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export const searchDocsToolDefinition = {
  name: 'search_docs',
  description: 'Busca endpoints, operaciones, etiquetas y modelos de datos en todas las especificaciones OpenAPI aprendidas por palabras clave.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Término de búsqueda (ej. "socio", "flights", "points", "booking", "memberId").'
      },
      specId: {
        type: 'string',
        description: 'ID o nombre de la especificación para limitar la búsqueda (opcional).'
      },
      tag: {
        type: 'string',
        description: 'Filtrar por etiqueta/tag específico (opcional, ej. "Members", "Flights").'
      },
      limit: {
        type: 'integer',
        description: 'Número máximo de resultados a retornar (por defecto 10, máximo 50).'
      }
    },
    required: ['query']
  }
};

export const getEndpointDocToolDefinition = {
  name: 'get_endpoint_doc',
  description: 'Obtiene la documentación completa, parámetros, request body y respuestas dereferenciadas de un endpoint específico.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Ruta del endpoint (ej. "/members/{memberId}", "/flights/search").'
      },
      method: {
        type: 'string',
        description: 'Método HTTP (GET, POST, PUT, DELETE, PATCH). Por defecto GET.',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
      },
      specId: {
        type: 'string',
        description: 'ID o nombre de la especificación a consultar (opcional).'
      }
    },
    required: ['path']
  }
};

export const getSchemaDocToolDefinition = {
  name: 'get_schema_doc',
  description: 'Obtiene la definición de un modelo de datos o schema dereferenciado (propiedades, tipos, campos obligatorios y enums).',
  inputSchema: {
    type: 'object',
    properties: {
      schemaName: {
        type: 'string',
        description: 'Nombre del schema o componente (ej. "MemberProfile", "FlightOffer", "AccrualRequest").'
      },
      specId: {
        type: 'string',
        description: 'ID o nombre de la especificación a consultar (opcional).'
      }
    },
    required: ['schemaName']
  }
};

export const generateIntegrationCodeToolDefinition = {
  name: 'generate_integration_code',
  description: 'Genera un snippet/cliente de código listo para producción en TypeScript, JavaScript, Python, cURL o C# para un endpoint específico.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Ruta del endpoint a integrar (ej. "/members/{memberId}/points/accrue", "/flights/search").'
      },
      method: {
        type: 'string',
        description: 'Método HTTP (GET, POST, PUT, DELETE, PATCH). Por defecto GET.',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
      },
      language: {
        type: 'string',
        description: 'Lenguaje de programación de destino.',
        enum: ['typescript', 'javascript', 'python', 'curl', 'csharp']
      },
      clientType: {
        type: 'string',
        description: 'Librería cliente HTTP preferida (ej. "fetch" o "axios" en TypeScript).',
        enum: ['fetch', 'axios', 'requests', 'httpx']
      },
      specId: {
        type: 'string',
        description: 'ID de la especificación (opcional).'
      }
    },
    required: ['path']
  }
};

export const getSecuritySchemesToolDefinition = {
  name: 'get_security_schemes',
  description: 'Obtiene los esquemas de autenticación y seguridad (Bearer token, API Key, OAuth2) definidos en las especificaciones OpenAPI.',
  inputSchema: {
    type: 'object',
    properties: {
      specId: {
        type: 'string',
        description: 'ID de la especificación (opcional, si se omite lista todos).'
      }
    }
  }
};

export const validatePayloadToolDefinition = {
  name: 'validate_payload',
  description: 'Valida si un payload JSON cumple con la estructura, campos obligatorios y tipos de datos del schema OpenAPI antes de generar código.',
  inputSchema: {
    type: 'object',
    properties: {
      schemaName: {
        type: 'string',
        description: 'Nombre del schema a validar contra (ej. "AccrualRequest", "MemberProfile").'
      },
      payload: {
        type: 'object',
        description: 'Objeto JSON a validar.'
      },
      specId: {
        type: 'string',
        description: 'ID de la especificación (opcional).'
      }
    },
    required: ['schemaName', 'payload']
  }
};

export const queryApiKnowledgeToolDefinition = {
  name: 'query_api_knowledge',
  description: 'Consulta y sintetiza el conocimiento transversal de las APIs OpenAPI aprendidas para resolver dudas de negocio o integración.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Pregunta o consulta técnica/negocio sobre la funcionalidad disponible en las APIs.'
      },
      specId: {
        type: 'string',
        description: 'ID o nombre de la especificación para restringir la consulta (opcional).'
      }
    },
    required: ['query']
  }
};
